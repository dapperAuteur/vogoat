import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { practiceTake, type Plan } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import type { TakeAudioStore } from "@/lib/blob-store";
import { MAX_AUDIO_BYTES, MAX_DURATION_MS } from "@/lib/takes/core";
import { recipeFromId, RECIPE_COUNT } from "@/lib/game/recipe";

// Saved practice takes (paid tiers). They never touch the daily: no attempt counting, no
// submission, no expiry clock. Audio still only leaves the device when the user saves.

const AUDIO_MIME_PREFIXES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"];

export type PracticeTakeView = { id: string; recipeId: number; creatureName: string; durationMs: number | null; createdAt: Date };

export async function savePracticeTake(
  db: Db,
  store: TakeAudioStore,
  args: { userId: string; plan: Plan; recipeId: number; bytes: Uint8Array; mime: string; durationMs: number },
): Promise<ActionResult<{ id: string }>> {
  if (args.plan === "free") return err("paid_only", "Saving practice takes comes with lifetime and subscription plans.");
  if (!Number.isInteger(args.recipeId) || args.recipeId < 1 || args.recipeId > RECIPE_COUNT) return err("bad_input", "Unknown recipe.");
  const baseMime = args.mime.split(";")[0].trim().toLowerCase();
  if (!AUDIO_MIME_PREFIXES.includes(baseMime)) return err("bad_mime", "That audio format is not supported.");
  if (args.bytes.byteLength === 0 || args.bytes.byteLength > MAX_AUDIO_BYTES) return err("too_large", "Practice takes are capped at 30 seconds.");
  if (args.durationMs <= 0 || args.durationMs > MAX_DURATION_MS) return err("too_long", "Practice takes are capped at 30 seconds.");
  const recipe = recipeFromId(args.recipeId);
  const [row] = await db
    .insert(practiceTake)
    .values({ userId: args.userId, recipeId: args.recipeId, recipe, durationMs: Math.round(args.durationMs), mime: baseMime, sizeBytes: args.bytes.byteLength })
    .returning();
  try {
    const blobUrl = await store.put(`practice-${row.id}`, args.bytes, baseMime);
    await db.update(practiceTake).set({ blobUrl }).where(eq(practiceTake.id, row.id));
  } catch (error: unknown) {
    await db.delete(practiceTake).where(eq(practiceTake.id, row.id));
    console.error("[practice] store.put failed:", error instanceof Error ? error.message : "unknown");
    return err("storage_unavailable", "Audio storage is not available right now; the recording is still on this device.");
  }
  return ok({ id: row.id });
}

export async function listPracticeTakes(db: Db, userId: string, limit = 20) {
  return db
    .select()
    .from(practiceTake)
    .where(and(eq(practiceTake.userId, userId), isNull(practiceTake.deletedAt)))
    .orderBy(desc(practiceTake.createdAt))
    .limit(limit);
}

export async function deletePracticeTake(db: Db, store: TakeAudioStore, args: { userId: string; id: string }): Promise<ActionResult<null>> {
  const [row] = await db.select().from(practiceTake).where(and(eq(practiceTake.id, args.id), eq(practiceTake.userId, args.userId)));
  if (!row) return err("not_found", "That practice take does not exist.");
  if (row.blobUrl) {
    try {
      await store.delete(row.blobUrl);
    } catch (error: unknown) {
      console.error("[practice] store.delete failed:", error instanceof Error ? error.constructor.name : "unknown");
    }
  }
  await db.update(practiceTake).set({ blobUrl: null, deletedAt: new Date() }).where(eq(practiceTake.id, row.id));
  return ok(null);
}
