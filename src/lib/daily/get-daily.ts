import { and, asc, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { creature, daily, script, type DailyStatus } from "@/db/schema";
import { type DayKey, dayKey, dayNumber } from "@/lib/game/day";
import type { CreatureLayers } from "@/lib/game/creature";
import { assembleFallback } from "@/lib/game/never-dark";
import type { Recipe } from "@/lib/game/recipe";
import { RECENT_WINDOW_DAYS } from "@/lib/game/sampler";

export type DailyView = {
  id: string;
  dayKey: DayKey;
  dayNumber: number;
  status: DailyStatus;
  recipeId: number;
  recipe: Recipe;
  script: { id: string; body: string };
  creature: { id: string; name: string; baseAnimal: string; layers: CreatureLayers };
};

/** Thrown when no approved script exists to assemble a fallback from (authoring has stalled). */
export class NoScriptAvailableError extends Error {
  constructor() {
    super("no approved script available for the never-dark fallback");
    this.name = "NoScriptAvailableError";
  }
}

export type DailyOptions = { timeZone: string; launchDate: string; now?: Date };

/**
 * The daily for today's shared date (PRD §6). Serves the approved row (flipping it to
 * `published`), or a `draft` promoted to `auto` and flagged, or assembles the never-dark
 * fallback. Concurrent first requests race on the unique date and the loser re-reads.
 */
export async function getDailyForToday(db: Db, opts: DailyOptions): Promise<DailyView> {
  const key = dayKey(opts.now ?? new Date(), opts.timeZone);
  const existing = await loadDaily(db, key);
  if (existing) return finalize(db, existing, key, opts.launchDate);

  const [used, recent, scripts] = await Promise.all([
    db.select({ recipeId: daily.recipeId }).from(daily),
    db.select({ recipe: daily.recipe }).from(daily).where(lt(daily.dayDate, key)).orderBy(desc(daily.dayDate)).limit(RECENT_WINDOW_DAYS),
    db
      .select({ id: script.id, body: script.body, status: script.status })
      .from(script)
      .where(and(inArray(script.status, ["backlog", "use"]), isNull(script.usedOn)))
      .orderBy(asc(script.createdAt)),
  ]);
  // Backlog first: `use` scripts are the ones BAM wants in authored dailies.
  const pool = [...scripts.filter((s) => s.status === "backlog"), ...scripts.filter((s) => s.status === "use")];
  const fallback = assembleFallback({
    dayKey: key,
    usedRecipeIds: new Set(used.map((u) => u.recipeId)),
    recentRecipes: recent.map((r) => r.recipe),
    scripts: pool,
  });
  if (!fallback) throw new NoScriptAvailableError();

  try {
    await db.transaction(async (tx) => {
      const [c] = await tx
        .insert(creature)
        .values({ name: fallback.creature.name, baseAnimal: fallback.creature.baseAnimal, layers: fallback.creature.layers })
        .returning({ id: creature.id });
      await tx.insert(daily).values({
        dayDate: key,
        recipeId: fallback.recipeId,
        recipe: fallback.recipe,
        scriptId: fallback.scriptId,
        creatureId: c.id,
        status: "auto",
        notes: `never-dark fallback assembled for ${key}; review retroactively (PRD §6.6)`,
      });
      await tx.update(script).set({ usedOn: key }).where(eq(script.id, fallback.scriptId));
    });
  } catch (error: unknown) {
    // Another instance won the race on daily.day_date; fall through to re-read.
    if (!isUniqueViolation(error)) throw error;
  }
  const row = await loadDaily(db, key);
  if (!row) throw new Error(`daily for ${key} vanished after insert`);
  return finalize(db, row, key, opts.launchDate);
}

type Loaded = NonNullable<Awaited<ReturnType<typeof loadDaily>>>;

async function loadDaily(db: Db, key: DayKey) {
  const rows = await db
    .select({
      id: daily.id,
      status: daily.status,
      recipeId: daily.recipeId,
      recipe: daily.recipe,
      scriptId: script.id,
      scriptBody: script.body,
      creatureId: creature.id,
      creatureName: creature.name,
      baseAnimal: creature.baseAnimal,
      layers: creature.layers,
    })
    .from(daily)
    .innerJoin(script, eq(script.id, daily.scriptId))
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .where(eq(daily.dayDate, key))
    .limit(1);
  return rows[0] ?? null;
}

async function finalize(db: Db, row: Loaded, key: DayKey, launchDate: string): Promise<DailyView> {
  let status = row.status;
  if (status === "approved") {
    await db.update(daily).set({ status: "published", updatedAt: new Date() }).where(eq(daily.id, row.id));
    status = "published";
  } else if (status === "draft") {
    // Never dark: the authored-but-unapproved row beats a random one; flag it for review.
    await db
      .update(daily)
      .set({ status: "auto", notes: `served unapproved on ${key}; review retroactively`, updatedAt: new Date() })
      .where(eq(daily.id, row.id));
    status = "auto";
  }
  return {
    id: row.id,
    dayKey: key,
    dayNumber: dayNumber(key, launchDate),
    status,
    recipeId: row.recipeId,
    recipe: row.recipe,
    script: { id: row.scriptId, body: row.scriptBody },
    creature: { id: row.creatureId, name: row.creatureName, baseAnimal: row.baseAnimal, layers: row.layers },
  };
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if (/unique|duplicate key|23505/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}
