import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, isNull, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { animalVerdict, creature, daily, script } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import { ANIMALS_BY_SIZE, deriveCreature, type BaseAnimal } from "@/lib/game/creature";
import { shiftDay, type DayKey } from "@/lib/game/day";
import { recipeFromId, type Recipe } from "@/lib/game/recipe";
import { RECENT_WINDOW_DAYS, pickRecipeId } from "@/lib/game/sampler";

// The authoring console core (PRD §6): BAM curates (recipe, script, creature) rows ahead of
// time; only approved rows publish; the runway rule wants >= 14 approved days queued.

export const RUNWAY_TARGET = 14;
export const RUNWAY_ALERT_BELOW = 7;

export type RunwayInfo = {
  /** Consecutive days from today (inclusive) covered by an approved/published daily. */
  consecutive: number;
  drafts: number;
  autosToReview: number;
};

export async function getRunway(db: Db, today: DayKey): Promise<RunwayInfo> {
  const rows = await db
    .select({ dayDate: daily.dayDate, status: daily.status })
    .from(daily)
    .where(gte(daily.dayDate, today))
    .orderBy(asc(daily.dayDate));
  const byDate = new Map(rows.map((r) => [r.dayDate, r.status]));
  let consecutive = 0;
  for (let d = today; ; d = shiftDay(d, 1)) {
    const status = byDate.get(d);
    if (status !== "approved" && status !== "published") break;
    consecutive++;
  }
  return {
    consecutive,
    drafts: rows.filter((r) => r.status === "draft").length,
    autosToReview: rows.filter((r) => r.status === "auto").length,
  };
}

async function excludedAnimals(db: Db): Promise<Set<string>> {
  const rows = await db.select({ animal: animalVerdict.animal }).from(animalVerdict).where(eq(animalVerdict.status, "never"));
  return new Set(rows.map((r) => r.animal));
}

/** Creates draft dailies for the next `days` dates that have no row yet. */
export async function extendQueue(db: Db, args: { today: DayKey; days: number }): Promise<ActionResult<{ created: number; skippedNoScript: number }>> {
  const [existing, pool, excluded] = await Promise.all([
    db.select({ dayDate: daily.dayDate, recipeId: daily.recipeId, recipe: daily.recipe }).from(daily).orderBy(asc(daily.dayDate)),
    db
      .select({ id: script.id, status: script.status })
      .from(script)
      .where(and(inArray(script.status, ["backlog", "use"]), isNull(script.usedOn)))
      .orderBy(asc(script.createdAt)),
    excludedAnimals(db),
  ]);
  const byDate = new Map(existing.map((r) => [r.dayDate, r]));
  const usedIds = new Set(existing.map((r) => r.recipeId));
  const recent: Recipe[] = existing.map((r) => r.recipe).slice(-RECENT_WINDOW_DAYS).reverse();
  const scripts = [...pool.filter((s) => s.status === "use"), ...pool.filter((s) => s.status === "backlog")];
  let created = 0;
  let skippedNoScript = 0;
  for (let i = 0; i < args.days; i++) {
    const date = shiftDay(args.today, i);
    if (byDate.has(date)) continue;
    const nextScript = scripts.shift();
    if (!nextScript) {
      skippedNoScript++;
      continue;
    }
    const recipeId = pickRecipeId({ seed: `author:${date}`, usedIds, recent });
    const recipe = recipeFromId(recipeId);
    const derived = deriveCreature(recipe, recipeId, undefined, excluded);
    await db.transaction(async (tx) => {
      const [c] = await tx.insert(creature).values({ name: derived.name, baseAnimal: derived.baseAnimal, layers: derived.layers }).returning({ id: creature.id });
      await tx.insert(daily).values({ dayDate: date, recipeId, recipe, scriptId: nextScript.id, creatureId: c.id, status: "draft" });
      await tx.update(script).set({ usedOn: date }).where(eq(script.id, nextScript.id));
    });
    usedIds.add(recipeId);
    recent.unshift(recipe);
    if (recent.length > RECENT_WINDOW_DAYS) recent.pop();
    created++;
  }
  return ok({ created, skippedNoScript });
}

async function loadDaily(db: Db, dailyId: string) {
  const rows = await db
    .select({ d: daily, creatureRow: creature })
    .from(daily)
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .where(eq(daily.id, dailyId));
  return rows[0] ?? null;
}

/** Approving flips draft → approved; auto rows can be blessed retroactively the same way. */
export async function approveDaily(db: Db, dailyId: string): Promise<ActionResult<null>> {
  const row = await loadDaily(db, dailyId);
  if (!row) return err("not_found", "No such daily.");
  if (row.d.status !== "draft" && row.d.status !== "auto") return err("wrong_state", "Only drafts (or auto days) can be approved.");
  await db.update(daily).set({ status: "approved", updatedAt: new Date() }).where(eq(daily.id, dailyId));
  return ok(null);
}

export async function revertDailyToDraft(db: Db, dailyId: string): Promise<ActionResult<null>> {
  const row = await loadDaily(db, dailyId);
  if (!row) return err("not_found", "No such daily.");
  if (row.d.status !== "approved") return err("wrong_state", "Only approved days can go back to draft.");
  await db.update(daily).set({ status: "draft", updatedAt: new Date() }).where(eq(daily.id, dailyId));
  return ok(null);
}

/** Reroll the base animal within the size class (PRD §6.3), skipping never animals. */
export async function rerollCreature(db: Db, dailyId: string): Promise<ActionResult<{ animal: string }>> {
  const row = await loadDaily(db, dailyId);
  if (!row) return err("not_found", "No such daily.");
  if (row.d.status !== "draft") return err("wrong_state", "Reroll drafts only; revert an approved day first.");
  const excluded = await excludedAnimals(db);
  const cls = ANIMALS_BY_SIZE[row.d.recipe.size];
  const options = cls.filter((a) => a !== row.creatureRow.baseAnimal && !excluded.has(a));
  if (options.length === 0) return err("no_alternative", "No other vetted animal in this size class.");
  const animal = options[Math.floor(Math.random() * options.length)] as BaseAnimal;
  const derived = deriveCreature(row.d.recipe, row.d.recipeId, animal, excluded);
  await db
    .update(creature)
    .set({ name: derived.name, baseAnimal: derived.baseAnimal, layers: derived.layers })
    .where(eq(creature.id, row.creatureRow.id));
  return ok({ animal });
}

/** Reroll the whole recipe (fresh draw, never a reused recipe) and re-derive the creature. */
export async function rerollRecipe(db: Db, dailyId: string): Promise<ActionResult<{ recipeId: number }>> {
  const row = await loadDaily(db, dailyId);
  if (!row) return err("not_found", "No such daily.");
  if (row.d.status !== "draft") return err("wrong_state", "Reroll drafts only; revert an approved day first.");
  const [existing, excluded] = await Promise.all([
    db.select({ recipeId: daily.recipeId, recipe: daily.recipe, dayDate: daily.dayDate }).from(daily).orderBy(asc(daily.dayDate)),
    excludedAnimals(db),
  ]);
  const usedIds = new Set(existing.map((r) => r.recipeId));
  const recent = existing.filter((r) => r.dayDate < row.d.dayDate).map((r) => r.recipe).slice(-RECENT_WINDOW_DAYS).reverse();
  const recipeId = pickRecipeId({ seed: `reroll:${randomUUID()}`, usedIds, recent });
  const recipe = recipeFromId(recipeId);
  const derived = deriveCreature(recipe, recipeId, undefined, excluded);
  await db.transaction(async (tx) => {
    await tx.update(daily).set({ recipeId, recipe, updatedAt: new Date() }).where(eq(daily.id, dailyId));
    await tx.update(creature).set({ name: derived.name, baseAnimal: derived.baseAnimal, layers: derived.layers }).where(eq(creature.id, row.creatureRow.id));
  });
  return ok({ recipeId });
}

/** Swap in a different approved, unused script; the old one returns to the pool. */
export async function swapScript(db: Db, dailyId: string, scriptId: string): Promise<ActionResult<null>> {
  const row = await loadDaily(db, dailyId);
  if (!row) return err("not_found", "No such daily.");
  if (row.d.status !== "draft") return err("wrong_state", "Swap on drafts only; revert an approved day first.");
  const [candidate] = await db.select().from(script).where(eq(script.id, scriptId));
  if (!candidate || (candidate.status !== "use" && candidate.status !== "backlog") || candidate.usedOn !== null) {
    return err("bad_script", "Pick an approved, unused script.");
  }
  await db.transaction(async (tx) => {
    await tx.update(script).set({ usedOn: null }).where(eq(script.id, row.d.scriptId));
    await tx.update(script).set({ usedOn: row.d.dayDate }).where(eq(script.id, scriptId));
    await tx.update(daily).set({ scriptId, updatedAt: new Date() }).where(eq(daily.id, dailyId));
  });
  return ok(null);
}
