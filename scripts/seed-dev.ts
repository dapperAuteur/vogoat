import { eq } from "drizzle-orm";
import { getDb, dbDriver } from "../src/db/client";
import { script } from "../src/db/schema";

// LOCAL ONLY: approves every batch-1 candidate so dailies can be assembled before BAM's
// triage exists. Refuses to touch Neon (that would ship unapproved scripts, invariant 3).
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
    console.error(error instanceof Error ? error.message : "unknown error");
    process.exit(1);
  });
