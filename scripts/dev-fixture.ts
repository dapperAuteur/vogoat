import { eq } from "drizzle-orm";
import { getDb, dbDriver } from "../src/db/client";
import * as schema from "../src/db/schema";
import { getDailyForToday } from "../src/lib/daily/get-daily";
import { createShare } from "../src/lib/share/core";

// LOCAL ONLY dev utility: gives EMAIL a kept+submitted take (tiny silent webm) for today plus
// an active share link, so payoff/menagerie/share surfaces can be exercised without a mic.
async function main() {
  if (process.env.ALLOW_DEV_SEED !== "1") throw new Error("set ALLOW_DEV_SEED=1");
  if (dbDriver() !== "pglite") throw new Error("refusing: dev fixture only runs against the embedded database");
  const email = process.env.FIXTURE_EMAIL ?? "tools@awews.com";
  const db = await getDb();
  const [user] = await db.select().from(schema.user).where(eq(schema.user.email, email));
  if (!user) throw new Error(`no user ${email}; sign in once first`);
  const daily = await getDailyForToday(db, { timeZone: "UTC", launchDate: "2026-09-01" });
  const existing = await db.select().from(schema.take).where(eq(schema.take.userId, user.id));
  const takeNumber = existing.length + 1;
  const [row] = await db
    .insert(schema.take)
    .values({ userId: user.id, dailyId: daily.id, takeNumber, status: "submitted", blobUrl: null, durationMs: 4200, mime: "audio/webm" })
    .returning();
  const shared = await createShare(db, { userId: user.id, takeId: row.id });
  if (!shared.ok) throw new Error(shared.code);
  console.log(JSON.stringify({ takeId: row.id, slug: shared.ok ? shared.data.slug : null }));
  process.exit(0);
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "unknown");
  process.exit(1);
});
