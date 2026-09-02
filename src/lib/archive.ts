import { and, asc, desc, eq, lt, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { creature, daily, script } from "@/db/schema";
import type { CreatureLayers } from "@/lib/game/creature";
import { dayNumber, type DayKey } from "@/lib/game/day";
import type { Recipe } from "@/lib/game/recipe";

// Public archive (BAM, 2026-09-02): past specimens are public and indexable, script text
// included. Today's stays the surprise, so every query is strictly before today.

export type ArchiveDay = {
  dayKey: string;
  dayNumber: number;
  creatureName: string;
  baseAnimal: string;
  layers: CreatureLayers;
  recipe: Recipe;
  scriptBody: string;
};

const PUBLISHED = ["published", "approved", "auto"] as const;

export async function listArchiveDays(db: Db, today: DayKey, launchDate: string, limit = 200): Promise<ArchiveDay[]> {
  const rows = await db
    .select({
      dayKey: daily.dayDate,
      creatureName: creature.name,
      baseAnimal: creature.baseAnimal,
      layers: creature.layers,
      recipe: daily.recipe,
      scriptBody: script.body,
    })
    .from(daily)
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .innerJoin(script, eq(script.id, daily.scriptId))
    .where(and(lt(daily.dayDate, today), inArray(daily.status, [...PUBLISHED])))
    .orderBy(desc(daily.dayDate))
    .limit(limit);
  return rows.map((r) => ({ ...r, dayNumber: dayNumber(r.dayKey as DayKey, launchDate) }));
}

export async function getArchiveDay(db: Db, dayKey: string, today: DayKey, launchDate: string): Promise<ArchiveDay | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || dayKey >= today) return null;
  const [row] = await db
    .select({
      dayKey: daily.dayDate,
      creatureName: creature.name,
      baseAnimal: creature.baseAnimal,
      layers: creature.layers,
      recipe: daily.recipe,
      scriptBody: script.body,
    })
    .from(daily)
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .innerJoin(script, eq(script.id, daily.scriptId))
    .where(and(eq(daily.dayDate, dayKey), inArray(daily.status, [...PUBLISHED])))
    .orderBy(asc(daily.dayDate));
  return row ? { ...row, dayNumber: dayNumber(row.dayKey as DayKey, launchDate) } : null;
}
