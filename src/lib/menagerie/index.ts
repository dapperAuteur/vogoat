import { and, asc, eq, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { creature, daily, take } from "@/db/schema";
import type { CreatureLayers } from "@/lib/game/creature";
import type { DayKey } from "@/lib/game/day";
import { computeStreaks, type Streaks } from "@/lib/game/streak";

export type GuildEntry = {
  dayKey: string;
  creatureName: string;
  layers: CreatureLayers;
  /** null = not submitted (a silhouette; "today" while the day is still open). */
  takeNumber: number | null;
  /** The submitted take's id, for playback of past recordings. */
  takeId: string | null;
  /** False once free-plan audio expired (the plate stays; PRD §5). */
  hasAudio: boolean;
  isToday: boolean;
};

export type GuildView = {
  entries: GuildEntry[]; // newest first, from today back to the first submitted day
  observed: number;
  missed: number;
  streaks: Streaks;
};

/** The collection never breaks: rows survive audio expiry; missed days show as silhouettes. */
export async function getGuild(db: Db, args: { userId: string; today: DayKey }): Promise<GuildView> {
  const rows = await db
    .select({
      dayKey: daily.dayDate,
      creatureName: creature.name,
      layers: creature.layers,
      takeNumber: take.takeNumber,
      takeId: take.id,
      blobUrl: take.blobUrl,
    })
    .from(daily)
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .leftJoin(take, and(eq(take.dailyId, daily.id), eq(take.userId, args.userId), eq(take.status, "submitted")))
    .where(lte(daily.dayDate, args.today))
    .orderBy(asc(daily.dayDate));

  const firstSubmitted = rows.findIndex((r) => r.takeNumber !== null);
  const relevant = firstSubmitted === -1 ? rows.filter((r) => r.dayKey === args.today) : rows.slice(firstSubmitted);
  const entries = relevant
    .map((r) => ({
      dayKey: r.dayKey,
      creatureName: r.creatureName,
      layers: r.layers,
      takeNumber: r.takeNumber,
      takeId: r.takeId,
      hasAudio: r.blobUrl !== null,
      isToday: r.dayKey === args.today,
    }))
    .reverse();
  const observed = entries.filter((e) => e.takeNumber !== null).length;
  const missed = entries.filter((e) => e.takeNumber === null && !e.isToday).length;
  const streaks = computeStreaks(
    entries.filter((e) => e.takeNumber !== null).map((e) => e.dayKey),
    args.today,
  );
  return { entries, observed, missed, streaks };
}
