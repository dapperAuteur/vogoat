import { and, isNotNull, lte, ne } from "drizzle-orm";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { take } from "@/db/schema";
import type { TakeAudioStore } from "@/lib/blob-store";

/**
 * Invariant 8: free-tier audio expires at 30 days; expiry nulls the blob, never the row.
 * Streaks and creatures are forever. Per-blob failures are skipped and retried next run.
 */
export async function expireTakeAudio(db: Db, store: TakeAudioStore, now: Date): Promise<{ expired: number; failed: number }> {
  const due = await db
    .select({ id: take.id, blobUrl: take.blobUrl })
    .from(take)
    .where(and(isNotNull(take.blobUrl), isNotNull(take.expiresAt), lte(take.expiresAt, now), ne(take.status, "discarded")));
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
  return { expired, failed };
}
