import { eq } from "drizzle-orm";
import { getDb, dbDriver } from "../src/db/client";
import { script } from "../src/db/schema";

// LOCAL ONLY: approves every batch-1 candidate so dailies can be assembled before BAM's
// triage exists. Refuses to touch Neon (that would ship unapproved scripts, invariant 3).

/** Prints the full cause chain; PGlite failures usually bury the real reason one level down. */
function explain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(`${current.constructor.name}: ${current.message}`);
    current = current.cause;
  }
  return parts.join("\n  caused by ") || "unknown error";
}

function hint(text: string): string {
  if (/CREATE SCHEMA|lock|access handle|NoModificationAllowed|corrupt/i.test(text)) {
    return (
      "\nHint: the embedded database (./.data/pglite) supports ONE process at a time and is disposable dev data." +
      "\n  - If `pnpm dev` is running against it, stop the dev server first (or triage in-app at /admin/scripts instead)." +
      "\n  - If it persists, delete the directory (`rm -rf .data/pglite`); it reseeds in seconds."
    );
  }
  return "";
}

async function main() {
  if (process.env.ALLOW_DEV_SEED !== "1") throw new Error("set ALLOW_DEV_SEED=1 (use `pnpm db:seed:dev`)");
  if (dbDriver() !== "pglite") throw new Error("refusing: dev seed only runs against the embedded PGlite database, never Neon");
  const db = await getDb();
  const rows = await db.update(script).set({ status: "backlog", decidedAt: new Date(), notes: "dev seed: auto-approved locally" }).where(eq(script.status, "candidate")).returning({ id: script.id });
  console.log(`dev seed: ${rows.length} candidates marked backlog (local database only)`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const text = explain(error);
    console.error(`Dev seed failed: ${text}${hint(text)}`);
    process.exit(1);
  });
