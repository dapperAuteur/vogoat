import { getDb } from "../../src/db/client";
import { getDailyForToday } from "../../src/lib/daily/get-daily";
import { env } from "../../src/lib/env";

/**
 * Back-fills two past dailies so /archive and /day/<date> have something to render. Runs as its
 * own process BEFORE the dev server starts: the embedded PGlite database allows exactly one
 * process at a time. Nothing in src/ is modified — the app's own assembler does the work, which
 * is also what guarantees the rows look exactly like real ones.
 */
async function main() {
  const db = await getDb();
  for (const daysAgo of [2, 1]) {
    const now = new Date(Date.now() - daysAgo * 86_400_000);
    const day = await getDailyForToday(db, {
      timeZone: env.DAILY_TIMEZONE,
      launchDate: env.LAUNCH_DATE,
      now,
    });
    console.log(`e2e seed: past daily ${day.dayKey} = ${day.creature.name}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("e2e archive seed failed:", error);
    process.exit(1);
  });
