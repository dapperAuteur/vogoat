import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { chromium } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  ADMIN_STATE,
  ARTIFACT_DIR,
  AUTH_DIR,
  BASE_URL,
  PID_FILE,
  PLAYER_EMAIL,
  PLAYER_NAME,
  PLAYER_STATE,
  PORT,
  REPO_ROOT,
  SERVER_LOG,
  serverEnv,
} from "./env";
import { signInAs } from "./magic-link";

/**
 * Owns the whole run: wipes last run's state, seeds the embedded database, starts `next dev`
 * with its output piped to a log (that log is how the magic link gets back to the tests), and
 * banks a signed-in storage state for the free player and for the admin.
 *
 * The dev server is started here rather than through Playwright's `webServer` for two reasons:
 * seeding must finish first (PGlite allows one process at a time) and the tests need the
 * server's stdout in a file they can grep.
 */

const childEnv = { ...process.env, ...serverEnv };

function run(command: string, args: string[], extraEnv: Record<string, string> = {}): void {
  const result = spawnSync(command, args, {
    cwd: REPO_ROOT,
    env: { ...childEnv, ...extraEnv },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

async function waitForServer(timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const log = fs.existsSync(SERVER_LOG) ? fs.readFileSync(SERVER_LOG, "utf8").slice(-4000) : "(no log)";
  throw new Error(`dev server did not become healthy on ${BASE_URL}\n${log}`);
}

/** A dev server left behind by an interrupted run would hold the PGlite lock and the port. */
function killLeftoverServer(): void {
  if (fs.existsSync(PID_FILE)) {
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (Number.isFinite(pid)) {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
  const listeners = spawnSync("lsof", ["-ti", `tcp:${PORT}`], { encoding: "utf8" });
  for (const line of (listeners.stdout ?? "").split("\n")) {
    const pid = Number(line.trim());
    if (Number.isFinite(pid) && pid > 0) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Already gone.
      }
    }
  }
}

export default async function globalSetup(): Promise<void> {
  killLeftoverServer();
  fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Seeding happens before the server starts: one process at a time on the embedded database.
  run("node", ["--import", "tsx", "scripts/seed.ts"]);
  run("node", ["--import", "tsx", "scripts/seed-dev.ts"], { ALLOW_DEV_SEED: "1" });
  run("node", ["--import", "tsx", "tests/e2e/seed-archive.ts"]);

  const log = fs.openSync(SERVER_LOG, "a");
  const server = spawn("node", ["node_modules/next/dist/bin/next", "dev", "-p", String(PORT)], {
    cwd: REPO_ROOT,
    env: childEnv,
    stdio: ["ignore", log, log],
    detached: true,
  });
  server.unref();
  fs.writeFileSync(PID_FILE, String(server.pid));
  // Anything that fails from here on must not leave the server (and the database lock) behind.
  try {
    await waitForServer();
    const browser = await chromium.launch();
    try {
      for (const account of [
        { email: PLAYER_EMAIL, name: PLAYER_NAME, state: PLAYER_STATE },
        { email: ADMIN_EMAIL, name: ADMIN_NAME, state: ADMIN_STATE },
      ]) {
        const context = await browser.newContext({ baseURL: BASE_URL });
        const page = await context.newPage();
        await signInAs(page, account.email, account.name);
        await context.storageState({ path: account.state });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error: unknown) {
    killLeftoverServer();
    throw error;
  }
}
