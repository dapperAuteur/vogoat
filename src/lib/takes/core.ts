import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { daily, take, type Plan } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import type { TakeAudioStore } from "@/lib/blob-store";

// The take lifecycle (PRD §7.3-4, invariants 1 and 2). Pure of framework: db and store are
// injected so every rule is testable against a real Postgres and a fake store.

export const FREE_TAKE_LIMIT = 3;
export const MAX_AUDIO_BYTES = 2_621_440; // ~2.5 MiB; PRD's ~2MB cap with container overhead
export const MAX_DURATION_MS = 31_000; // 30s cap plus stop latency
const AUDIO_MIME_PREFIXES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"];
const EXPIRY_DAYS = 30;

export type TakeView = {
  id: string;
  takeNumber: number;
  status: string;
  durationMs: number | null;
  hasAudio: boolean;
};

function view(row: typeof take.$inferSelect): TakeView {
  return { id: row.id, takeNumber: row.takeNumber, status: row.status, durationMs: row.durationMs, hasAudio: row.blobUrl != null };
}

export function takeLimitFor(plan: Plan): number | null {
  return plan === "free" ? FREE_TAKE_LIMIT : null;
}

/** Registers an attempt at record-start; counts are server-tracked, audio is not (invariant 2). */
export async function registerTake(
  db: Db,
  args: { userId: string; plan: Plan; dailyId: string },
): Promise<ActionResult<{ takeId: string; takeNumber: number; limit: number | null }>> {
  const limit = takeLimitFor(args.plan);
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await db.select({ n: take.takeNumber }).from(take).where(and(eq(take.userId, args.userId), eq(take.dailyId, args.dailyId)));
    if (limit !== null && rows.length >= limit) {
      return err("take_limit", `That's all ${limit} takes for today. Tomorrow is a new recipe.`);
    }
    const takeNumber = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.n)) + 1;
    try {
      const [row] = await db.insert(take).values({ userId: args.userId, dailyId: args.dailyId, takeNumber }).returning();
      return ok({ takeId: row.id, takeNumber, limit });
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error; // concurrent register; re-count
    }
  }
  return err("conflict", "Could not register the take; try again.");
}

/** Upload happens ONLY here, when the user chose to keep (invariant 2). */
export async function keepTake(
  db: Db,
  store: TakeAudioStore,
  args: { userId: string; plan: Plan; takeId: string; bytes: Uint8Array; mime: string; durationMs: number },
): Promise<ActionResult<TakeView>> {
  const baseMime = args.mime.split(";")[0].trim().toLowerCase();
  if (!AUDIO_MIME_PREFIXES.includes(baseMime)) return err("bad_mime", "That audio format is not supported.");
  if (args.bytes.byteLength === 0 || args.bytes.byteLength > MAX_AUDIO_BYTES) return err("too_large", "Takes are capped at 30 seconds / ~2MB.");
  if (args.durationMs <= 0 || args.durationMs > MAX_DURATION_MS) return err("too_long", "Takes are capped at 30 seconds.");
  const [row] = await db.select().from(take).where(and(eq(take.id, args.takeId), eq(take.userId, args.userId)));
  if (!row) return err("not_found", "That take does not exist.");
  if (row.status !== "recorded") return err("wrong_state", "Only a fresh recording can be kept.");
  const blobUrl = await store.put(row.id, args.bytes, baseMime);
  const expiresAt = args.plan === "free" ? new Date(row.createdAt.getTime() + EXPIRY_DAYS * 86_400_000) : null;
  const [updated] = await db
    .update(take)
    .set({ status: "kept", blobUrl, mime: baseMime, sizeBytes: args.bytes.byteLength, durationMs: Math.round(args.durationMs), expiresAt })
    .where(eq(take.id, row.id))
    .returning();
  return ok(view(updated));
}

/** Discard deletes the audio everywhere; the attempt row (the count) remains. */
export async function discardTake(
  db: Db,
  store: TakeAudioStore,
  args: { userId: string; takeId: string },
): Promise<ActionResult<TakeView>> {
  const [row] = await db.select().from(take).where(and(eq(take.id, args.takeId), eq(take.userId, args.userId)));
  if (!row) return err("not_found", "That take does not exist.");
  if (row.status === "submitted") return err("wrong_state", "A submitted take cannot be discarded.");
  if (row.blobUrl) await store.delete(row.blobUrl);
  const [updated] = await db
    .update(take)
    .set({ status: "discarded", blobUrl: null, deletedAt: new Date() })
    .where(eq(take.id, row.id))
    .returning();
  return ok(view(updated));
}

/** One submission per day per account, every tier; the schema enforces it (invariant 1). */
export async function submitTake(
  db: Db,
  args: { userId: string; takeId: string; todayKey: string },
): Promise<ActionResult<TakeView>> {
  const rows = await db
    .select({ t: take, dayDate: daily.dayDate })
    .from(take)
    .innerJoin(daily, eq(daily.id, take.dailyId))
    .where(and(eq(take.id, args.takeId), eq(take.userId, args.userId)));
  const row = rows[0];
  if (!row) return err("not_found", "That take does not exist.");
  if (row.t.status !== "kept") return err("wrong_state", "Keep a take before submitting it.");
  if (row.dayDate !== args.todayKey) return err("day_over", "That day is over; no back-filling. Today has a new recipe.");
  try {
    const [updated] = await db.update(take).set({ status: "submitted" }).where(eq(take.id, row.t.id)).returning();
    return ok(view(updated));
  } catch (error: unknown) {
    if (isUniqueViolation(error)) return err("already_submitted", "You already submitted a take today. One entry per day, every tier.");
    throw error;
  }
}

export async function listTakes(db: Db, args: { userId: string; dailyId: string }): Promise<TakeView[]> {
  const rows = await db.select().from(take).where(and(eq(take.userId, args.userId), eq(take.dailyId, args.dailyId))).orderBy(take.takeNumber);
  return rows.map(view);
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if (/unique|duplicate key|23505/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}
