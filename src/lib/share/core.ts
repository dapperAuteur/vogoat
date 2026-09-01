import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { creature, daily, report, script, share, take, user } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import type { CreatureLayers } from "@/lib/game/creature";
import type { Recipe } from "@/lib/game/recipe";
import { newShareSlug } from "./slug";

// Sharing is pull, not push (PRD §11): an unguessable link the owner hands out, revocable,
// reportable. One share row per take; revoking and re-sharing mints a NEW slug so old links die.

export type ShareInfo = { shareId: string; slug: string };

export async function createShare(db: Db, args: { userId: string; takeId: string }): Promise<ActionResult<ShareInfo>> {
  const [row] = await db.select().from(take).where(and(eq(take.id, args.takeId), eq(take.userId, args.userId)));
  if (!row) return err("not_found", "That take does not exist.");
  if (row.status !== "submitted") return err("wrong_state", "Only your submitted take can be shared.");
  const [existing] = await db.select().from(share).where(eq(share.takeId, row.id));
  if (existing && existing.revokedAt === null) return ok({ shareId: existing.id, slug: existing.slug });
  if (existing) {
    const [revived] = await db.update(share).set({ slug: newShareSlug(), revokedAt: null }).where(eq(share.id, existing.id)).returning();
    return ok({ shareId: revived.id, slug: revived.slug });
  }
  const [created] = await db.insert(share).values({ takeId: row.id, slug: newShareSlug() }).returning();
  return ok({ shareId: created.id, slug: created.slug });
}

export async function revokeShare(db: Db, args: { userId: string; takeId: string }): Promise<ActionResult<null>> {
  const [row] = await db
    .select({ shareId: share.id })
    .from(share)
    .innerJoin(take, eq(take.id, share.takeId))
    .where(and(eq(share.takeId, args.takeId), eq(take.userId, args.userId)));
  if (!row) return err("not_found", "No share link exists for that take.");
  await db.update(share).set({ revokedAt: new Date() }).where(eq(share.id, row.shareId));
  return ok(null);
}

export type ShareView = {
  slug: string;
  dayKey: string;
  performerName: string;
  creatureName: string;
  baseAnimal: string;
  layers: CreatureLayers;
  recipe: Recipe;
  recipeId: number;
  scriptBody: string;
  takeNumber: number;
  durationMs: number | null;
  /** false once free-plan audio expired; the card stays live (PRD §5). */
  audioAvailable: boolean;
};

/** Null = unknown or revoked slug; revoked links die (revocable, PRD §11). */
export async function getShareView(db: Db, slug: string): Promise<ShareView | null> {
  const rows = await db
    .select({
      slug: share.slug,
      revokedAt: share.revokedAt,
      dayKey: daily.dayDate,
      performerName: user.name,
      creatureName: creature.name,
      baseAnimal: creature.baseAnimal,
      layers: creature.layers,
      recipe: daily.recipe,
      recipeId: daily.recipeId,
      scriptBody: script.body,
      takeNumber: take.takeNumber,
      durationMs: take.durationMs,
      blobUrl: take.blobUrl,
    })
    .from(share)
    .innerJoin(take, eq(take.id, share.takeId))
    .innerJoin(user, eq(user.id, take.userId))
    .innerJoin(daily, eq(daily.id, take.dailyId))
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .innerJoin(script, eq(script.id, daily.scriptId))
    .where(eq(share.slug, slug));
  const row = rows[0];
  if (!row || row.revokedAt !== null) return null;
  return {
    slug: row.slug,
    dayKey: row.dayKey,
    performerName: row.performerName,
    creatureName: row.creatureName,
    baseAnimal: row.baseAnimal,
    layers: row.layers,
    recipe: row.recipe,
    recipeId: row.recipeId,
    scriptBody: row.scriptBody,
    takeNumber: row.takeNumber,
    durationMs: row.durationMs,
    audioAvailable: row.blobUrl !== null,
  };
}

const REPORT_REASONS = ["harassment", "hate", "sexual", "privacy", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export { REPORT_REASONS };

/** Every shared page carries a report button; BAM triages (PRD §3 moderation). */
export async function reportShare(db: Db, args: { slug: string; reason: string; detail: string | null }): Promise<ActionResult<null>> {
  if (!REPORT_REASONS.includes(args.reason as ReportReason)) return err("bad_input", "Pick a reason.");
  const [row] = await db.select({ id: share.id }).from(share).where(eq(share.slug, args.slug));
  if (!row) return err("not_found", "That page no longer exists.");
  await db.insert(report).values({ shareId: row.id, reason: args.reason, detail: args.detail?.slice(0, 2000) || null });
  return ok(null);
}
