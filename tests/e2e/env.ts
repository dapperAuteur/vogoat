import path from "node:path";

/**
 * One place for every path, port and env value the end-to-end run needs, so global setup
 * (which owns the dev server) and the specs (which run in separate worker processes) agree
 * without passing anything through process.env.
 */

/** tests/e2e -> repo root. */
export const REPO_ROOT = path.resolve(__dirname, "..", "..");
/**
 * Everything the run writes lives here and is wiped at the start of each run. It sits under
 * `.data/` on purpose: that path is already gitignored, eslint-ignored and tsconfig-excluded,
 * so the reports and the embedded database never reach `pnpm lint` or `pnpm typecheck`.
 */
export const ARTIFACT_DIR = path.join(REPO_ROOT, ".data", "e2e");

export const PORT = 3061;
export const BASE_URL = `http://localhost:${PORT}`;

export const SERVER_LOG = path.join(ARTIFACT_DIR, "dev-server.log");
export const PID_FILE = path.join(ARTIFACT_DIR, "dev-server.pid");
export const PGLITE_DIR = path.join(ARTIFACT_DIR, "pglite");
export const BLOB_DIR = path.join(ARTIFACT_DIR, "blobs");
export const AUTH_DIR = path.join(ARTIFACT_DIR, "auth");
export const PLAYER_STATE = path.join(AUTH_DIR, "player.json");
export const ADMIN_STATE = path.join(AUTH_DIR, "admin.json");

/** Invariant 7: admin is whoever matches ADMIN_EMAIL, so the suite sets its own. */
export const ADMIN_EMAIL = "admin@example.com";
export const ADMIN_NAME = "Ada Admin";
/** The free-plan account that records, keeps and submits. */
export const PLAYER_EMAIL = "player@example.com";
export const PLAYER_NAME = "Pat Player";

/** Fixed so day numbers are stable and positive whenever the suite runs. */
const LAUNCH_DATE = "2026-01-01";

/**
 * No external services: an empty DATABASE_URL selects the embedded PGlite database, empty
 * Mailgun keys make the mailer print the magic link to the dev server's stdout, and the blob
 * store falls back to a local directory. Every variable that could leak a real service in from
 * the developer's shell is explicitly blanked.
 */
export const serverEnv: Record<string, string> = {
  NODE_ENV: "development",
  DATABASE_URL: "",
  STORAGE_DATABASE_URL: "",
  STORAGE_POSTGRES_URL: "",
  MAILGUN_API_KEY: "",
  MAILGUN_DOMAIN: "",
  BLOB_READ_WRITE_TOKEN: "",
  WITUS_OIDC_CLIENT_ID: "",
  WITUS_OIDC_CLIENT_SECRET: "",
  STRIPE_SECRET_KEY: "",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  PGLITE_DIR: PGLITE_DIR,
  BLOB_LOCAL_DIR: BLOB_DIR,
  ADMIN_EMAIL,
  APP_URL: BASE_URL,
  BETTER_AUTH_URL: BASE_URL,
  BETTER_AUTH_SECRET: "e2e-secret-minimum-32-characters-aaaaaaaaaaaa",
  DAILY_TIMEZONE: "UTC",
  LAUNCH_DATE,
};

/** The day key (UTC, per DAILY_TIMEZONE above) `daysAgo` days before now. */
export function dayKeyAgo(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}
