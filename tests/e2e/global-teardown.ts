import fs from "node:fs";
import { PID_FILE } from "./env";

/** Stops the dev server global setup started (killing the group: `next dev` forks workers). */
export default async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(PID_FILE)) return;
  const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
  fs.rmSync(PID_FILE, { force: true });
  if (!Number.isFinite(pid)) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
