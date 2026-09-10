import { and, eq, isNotNull, isNull, lte, ne, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { practiceTake, take } from "@/db/schema";
import type { TakeAudioStore } from "@/lib/blob-store";

export const RETENTION_DAYS = 30;

/**
 * Invariant 8 (BAM, 2026-09-10): every recording on every plan is deleted 30 days after it
 * was made. Daily takes keep their row (the Guild, streaks, and share cards survive; only
 * blob_url is nulled). Practice takes have no collection behind them, so the row is marked
 * deleted too. Rows from before the change can have a null expires_at (upgrades used to clear
 * it), so the deadline falls back to created_at + 30 days. Per-blob failures are skipped and
 * retried on the next run.
 */
export async function expireTakeAudio(
  db: Db,
  store: TakeAudioStore,
  now: Date,
): Promise<{ expired: number; practiceExpired: number; failed: number }> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000);
  const due = await db
    .select({ id: take.id, blobUrl: take.blobUrl })
    .from(take)
    .where(
      and(
        isNotNull(take.blobUrl),
        ne(take.status, "discarded"),
        lte(sql`coalesce(${take.expiresAt}, ${take.createdAt} + make_interval(days => ${RETENTION_DAYS}))`, now),
      ),
    );
  let expired = 0;
  let failed = 0;
  for (const row of due) {
    try {
      if (row.blobUrl) await store.delete(row.blobUrl);
      await db.update(take).set({ blobUrl: null }).where(eq(take.id, row.id));
      expired++;
    } catch (error: unknown) {
      failed++;
      console.error("[expiry] blob delete failed:", error instanceof Error ? error.constructor.name : "unknown");
    }
  }

  const practiceDue = await db
    .select({ id: practiceTake.id, blobUrl: practiceTake.blobUrl })
    .from(practiceTake)
    .where(and(isNotNull(practiceTake.blobUrl), isNull(practiceTake.deletedAt), lte(practiceTake.createdAt, cutoff)));
  let practiceExpired = 0;
  for (const row of practiceDue) {
    try {
      if (row.blobUrl) await store.delete(row.blobUrl);
      await db.update(practiceTake).set({ blobUrl: null, deletedAt: now }).where(eq(practiceTake.id, row.id));
      practiceExpired++;
    } catch (error: unknown) {
      failed++;
      console.error("[expiry] practice blob delete failed:", error instanceof Error ? error.constructor.name : "unknown");
    }
  }
  return { expired, practiceExpired, failed };
}
