import { and, eq, gte, inArray, lte, ne, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  daily,
  practiceTake,
  purchase,
  report,
  share,
  take,
  user,
  workshopEntry,
  type Plan,
} from "@/db/schema";
import { shiftDay, type DayKey } from "@/lib/game/day";
import { computeStreaks } from "@/lib/game/streak";

/**
 * Usage analytics from our own database (plans/future/04): what players use versus what they
 * avoid, expressed as the PRD §15 funnel and its drop-offs. No PII leaves these functions —
 * every value is a count, a ratio, or a day key.
 *
 * Rules of the house:
 * - Windows are day keys, not wall-clock timestamps, so a run at 23:59 and one at 00:01 in the
 *   same VoGoat day report the same numbers, and tests are deterministic.
 * - Admins are excluded from every player-side number: BAM records every day and would be a
 *   double-digit share of a small population.
 * - Everything is an aggregate query except the submitted (user, day) pairs, which streak math
 *   needs row by row.
 */

/** A daily only counts as served once its date arrived and it was actually loaded. */
const SERVED = ["published", "auto"] as const;
const DAYS_IN_SERIES = 14;
/** The cohort gate for the D7 measure: first submission at least this many days back. */
const D7_DAYS = 7;

function countWhere(cond: SQL) {
  return sql<number>`count(*) filter (where ${cond})`.mapWith(Number);
}
function countDistinctWhere(column: SQL, cond: SQL) {
  return sql<number>`count(distinct ${column}) filter (where ${cond})`.mapWith(Number);
}

export type WindowKey = "all" | "last7" | "last30";

export type FunnelCounts = {
  /** Dailies whose date arrived and which were actually loaded by somebody. */
  dailiesServed: number;
  /** Take rows registered at record-start, every status. */
  takesRegistered: number;
  /** Distinct non-admin accounts that registered at least one take. */
  playersWhoStarted: number;
  /** Takes currently kept or submitted (a kept take discarded later is not counted). */
  keptTakes: number;
  submittedTakes: number;
  playersWhoSubmitted: number;
  /** Distinct (account, day) pairs with at least one take: one player's attempt at one day. */
  playerDays: number;
};

export type FunnelRates = {
  /** Kept ÷ registered: how often a recording survives the first listen. */
  keepRate: number | null;
  /** Submitted ÷ kept: how often a keeper is actually entered. */
  submitRate: number | null;
  /** Submitted ÷ registered. The PRD §15 headline; kill criterion is ~20%. */
  startToSubmit: number | null;
  /** Share of players who started a take and never submitted one. */
  playerDropOff: number | null;
};

export type DaySubmitters = { dayKey: string; submitters: number };

export type HabitStats = {
  /** Last 14 days, oldest first, zero-filled for days nobody submitted. */
  series: DaySubmitters[];
  /** Players whose first submission is D7_DAYS or more days back. */
  d7Cohort: number;
  /** Of that cohort, how many submitted again on a later day. */
  d7Returned: number;
  d7Rate: number | null;
  medianCurrentStreak: number;
  maxCurrentStreak: number;
  maxBestStreak: number;
  /** Players with any submission at all; the denominator for the streak stats. */
  streakPopulation: number;
};

export type TakeNumberSlice = { takeNumber: number; submissions: number };

export type UsageStats = {
  sharesCreated: number;
  sharesCreated30: number;
  sharesRevoked: number;
  sharesLive: number;
  reportsFiled: number;
  reportsFiled30: number;
  reportsOpen: number;
  practiceTakes: number;
  practiceTakes30: number;
  practiceUsers: number;
  workshopEntries: number;
  workshopEntries30: number;
  workshopWriters: number;
  /** Average take number of a submitted take: are people spending their three? */
  avgSubmittedTakeNumber: number | null;
  takeNumbers: TakeNumberSlice[];
};

export type PlanSlice = { plan: Plan; players: number; new7: number; new30: number };

export type Population = {
  plans: PlanSlice[];
  players: number;
  admins: number;
  new7: number;
  new30: number;
  stripePurchases: number;
  stripeCents: number;
};

export type AnalyticsReport = {
  today: DayKey;
  windowStart7: DayKey;
  windowStart30: DayKey;
  funnel: Record<WindowKey, FunnelCounts>;
  habit: HabitStats;
  usage: UsageStats;
  population: Population;
};

/** Percentages, guarded: a zero denominator is "no data yet", never 0% and never NaN. */
export function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function funnelRates(counts: FunnelCounts): FunnelRates {
  return {
    keepRate: rate(counts.keptTakes, counts.takesRegistered),
    submitRate: rate(counts.submittedTakes, counts.keptTakes),
    startToSubmit: rate(counts.submittedTakes, counts.takesRegistered),
    playerDropOff: rate(counts.playersWhoStarted - counts.playersWhoSubmitted, counts.playersWhoStarted),
  };
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Streaks and D7 return from one flat list of (player, submitted day) pairs. */
export function habitFromSubmissions(
  rows: readonly { userId: string; dayKey: string }[],
  today: DayKey,
): Omit<HabitStats, "series"> {
  const byUser = new Map<string, string[]>();
  for (const row of rows) {
    const days = byUser.get(row.userId);
    if (days) days.push(row.dayKey);
    else byUser.set(row.userId, [row.dayKey]);
  }
  const cohortCutoff = shiftDay(today, -D7_DAYS);
  const currents: number[] = [];
  let maxBest = 0;
  let d7Cohort = 0;
  let d7Returned = 0;
  for (const days of byUser.values()) {
    const unique = [...new Set(days)].sort();
    const streaks = computeStreaks(unique, today);
    currents.push(streaks.current);
    if (streaks.best > maxBest) maxBest = streaks.best;
    if (unique[0] <= cohortCutoff) {
      d7Cohort += 1;
      if (unique.length > 1) d7Returned += 1;
    }
  }
  return {
    d7Cohort,
    d7Returned,
    d7Rate: rate(d7Returned, d7Cohort),
    medianCurrentStreak: median(currents),
    maxCurrentStreak: currents.length === 0 ? 0 : Math.max(...currents),
    maxBestStreak: maxBest,
    streakPopulation: byUser.size,
  };
}

/** Zero-fills the last `DAYS_IN_SERIES` days so a gap reads as a gap, not as a missing bar. */
export function fillSeries(rows: readonly DaySubmitters[], today: DayKey): DaySubmitters[] {
  const found = new Map(rows.map((r) => [r.dayKey, r.submitters]));
  return Array.from({ length: DAYS_IN_SERIES }, (_, i) => {
    const dayKey = shiftDay(today, i - (DAYS_IN_SERIES - 1));
    return { dayKey, submitters: found.get(dayKey) ?? 0 };
  });
}

/** The whole page in one call. Independent aggregates run together. */
export async function getAnalyticsReport(db: Db, today: DayKey): Promise<AnalyticsReport> {
  const start7 = shiftDay(today, -6);
  const start30 = shiftDay(today, -29);
  const cutoff7 = new Date(`${start7}T00:00:00Z`);
  const cutoff30 = new Date(`${start30}T00:00:00Z`);
  const seriesStart = shiftDay(today, -(DAYS_IN_SERIES - 1));

  const inWindow = (start: DayKey) => sql`${daily.dayDate} >= ${start}`;
  const playersOnly = and(ne(user.role, "admin"), lte(daily.dayDate, today));
  const submittedOnly = and(eq(take.status, "submitted"), playersOnly);

  const [
    dailyRows,
    takeRows,
    numberRows,
    seriesRows,
    submissionRows,
    shareRow,
    reportRow,
    practiceRow,
    workshopRow,
    planRows,
    purchaseRow,
  ] = await Promise.all([
    db
      .select({
        all: countWhere(sql`true`),
        last7: countWhere(inWindow(start7)),
        last30: countWhere(inWindow(start30)),
      })
      .from(daily)
      .where(and(lte(daily.dayDate, today), inArray(daily.status, [...SERVED]))),

    db
      .select({
        registeredAll: countWhere(sql`true`),
        registered7: countWhere(inWindow(start7)),
        registered30: countWhere(inWindow(start30)),
        keptAll: countWhere(sql`${take.status} in ('kept', 'submitted')`),
        kept7: countWhere(sql`${take.status} in ('kept', 'submitted') and ${daily.dayDate} >= ${start7}`),
        kept30: countWhere(sql`${take.status} in ('kept', 'submitted') and ${daily.dayDate} >= ${start30}`),
        submittedAll: countWhere(sql`${take.status} = 'submitted'`),
        submitted7: countWhere(sql`${take.status} = 'submitted' and ${daily.dayDate} >= ${start7}`),
        submitted30: countWhere(sql`${take.status} = 'submitted' and ${daily.dayDate} >= ${start30}`),
        startersAll: countDistinctWhere(sql`${take.userId}`, sql`true`),
        starters7: countDistinctWhere(sql`${take.userId}`, inWindow(start7)),
        starters30: countDistinctWhere(sql`${take.userId}`, inWindow(start30)),
        submittersAll: countDistinctWhere(sql`${take.userId}`, sql`${take.status} = 'submitted'`),
        submitters7: countDistinctWhere(sql`${take.userId}`, sql`${take.status} = 'submitted' and ${daily.dayDate} >= ${start7}`),
        submitters30: countDistinctWhere(sql`${take.userId}`, sql`${take.status} = 'submitted' and ${daily.dayDate} >= ${start30}`),
        playerDaysAll: countDistinctWhere(sql`(${take.userId}, ${take.dailyId})`, sql`true`),
        playerDays7: countDistinctWhere(sql`(${take.userId}, ${take.dailyId})`, inWindow(start7)),
        playerDays30: countDistinctWhere(sql`(${take.userId}, ${take.dailyId})`, inWindow(start30)),
      })
      .from(take)
      .innerJoin(daily, eq(daily.id, take.dailyId))
      .innerJoin(user, eq(user.id, take.userId))
      .where(playersOnly),

    db
      .select({ takeNumber: take.takeNumber, submissions: countWhere(sql`true`) })
      .from(take)
      .innerJoin(daily, eq(daily.id, take.dailyId))
      .innerJoin(user, eq(user.id, take.userId))
      .where(submittedOnly)
      .groupBy(take.takeNumber)
      .orderBy(take.takeNumber),

    db
      .select({ dayKey: daily.dayDate, submitters: sql<number>`count(distinct ${take.userId})`.mapWith(Number) })
      .from(take)
      .innerJoin(daily, eq(daily.id, take.dailyId))
      .innerJoin(user, eq(user.id, take.userId))
      .where(and(submittedOnly, gte(daily.dayDate, seriesStart)))
      .groupBy(daily.dayDate)
      .orderBy(daily.dayDate),

    db
      .select({ userId: take.userId, dayKey: daily.dayDate })
      .from(take)
      .innerJoin(daily, eq(daily.id, take.dailyId))
      .innerJoin(user, eq(user.id, take.userId))
      .where(submittedOnly)
      .orderBy(take.userId, daily.dayDate),

    db
      .select({
        created: countWhere(sql`true`),
        created30: countWhere(sql`${share.createdAt} >= ${cutoff30}`),
        revoked: countWhere(sql`${share.revokedAt} is not null`),
        live: countWhere(sql`${share.revokedAt} is null`),
      })
      .from(share),

    db
      .select({
        filed: countWhere(sql`true`),
        filed30: countWhere(sql`${report.createdAt} >= ${cutoff30}`),
        open: countWhere(sql`${report.status} = 'open'`),
      })
      .from(report),

    db
      .select({
        takes: countWhere(sql`true`),
        takes30: countWhere(sql`${practiceTake.createdAt} >= ${cutoff30}`),
        users: countDistinctWhere(sql`${practiceTake.userId}`, sql`true`),
      })
      .from(practiceTake),

    db
      .select({
        entries: countWhere(sql`true`),
        entries30: countWhere(sql`${workshopEntry.createdAt} >= ${cutoff30}`),
        writers: countDistinctWhere(sql`${workshopEntry.userId}`, sql`true`),
      })
      .from(workshopEntry),

    db
      .select({
        plan: user.plan,
        players: countWhere(sql`${user.role} <> 'admin'`),
        admins: countWhere(sql`${user.role} = 'admin'`),
        new7: countWhere(sql`${user.role} <> 'admin' and ${user.createdAt} >= ${cutoff7}`),
        new30: countWhere(sql`${user.role} <> 'admin' and ${user.createdAt} >= ${cutoff30}`),
      })
      .from(user)
      .groupBy(user.plan),

    db
      .select({
        count: countWhere(sql`true`),
        cents: sql<number>`coalesce(sum(${purchase.amount}), 0)`.mapWith(Number),
      })
      .from(purchase),
  ]);

  const d = dailyRows[0];
  const t = takeRows[0];
  const counts = (
    dailiesServed: number,
    registered: number,
    starters: number,
    kept: number,
    submitted: number,
    submitters: number,
    playerDays: number,
  ): FunnelCounts => ({
    dailiesServed,
    takesRegistered: registered,
    playersWhoStarted: starters,
    keptTakes: kept,
    submittedTakes: submitted,
    playersWhoSubmitted: submitters,
    playerDays,
  });

  const takeNumbers = numberRows.map((r) => ({ takeNumber: r.takeNumber, submissions: r.submissions }));
  const submittedTotal = takeNumbers.reduce((sum, s) => sum + s.submissions, 0);
  const takeNumberSum = takeNumbers.reduce((sum, s) => sum + s.takeNumber * s.submissions, 0);

  return {
    today,
    windowStart7: start7,
    windowStart30: start30,
    funnel: {
      all: counts(d.all, t.registeredAll, t.startersAll, t.keptAll, t.submittedAll, t.submittersAll, t.playerDaysAll),
      last7: counts(d.last7, t.registered7, t.starters7, t.kept7, t.submitted7, t.submitters7, t.playerDays7),
      last30: counts(d.last30, t.registered30, t.starters30, t.kept30, t.submitted30, t.submitters30, t.playerDays30),
    },
    habit: {
      series: fillSeries(seriesRows, today),
      ...habitFromSubmissions(submissionRows, today),
    },
    usage: {
      sharesCreated: shareRow[0].created,
      sharesCreated30: shareRow[0].created30,
      sharesRevoked: shareRow[0].revoked,
      sharesLive: shareRow[0].live,
      reportsFiled: reportRow[0].filed,
      reportsFiled30: reportRow[0].filed30,
      reportsOpen: reportRow[0].open,
      practiceTakes: practiceRow[0].takes,
      practiceTakes30: practiceRow[0].takes30,
      practiceUsers: practiceRow[0].users,
      workshopEntries: workshopRow[0].entries,
      workshopEntries30: workshopRow[0].entries30,
      workshopWriters: workshopRow[0].writers,
      avgSubmittedTakeNumber: submittedTotal > 0 ? takeNumberSum / submittedTotal : null,
      takeNumbers,
    },
    population: {
      plans: planRows.map((r) => ({ plan: r.plan, players: r.players, new7: r.new7, new30: r.new30 })),
      players: planRows.reduce((sum, r) => sum + r.players, 0),
      admins: planRows.reduce((sum, r) => sum + r.admins, 0),
      new7: planRows.reduce((sum, r) => sum + r.new7, 0),
      new30: planRows.reduce((sum, r) => sum + r.new30, 0),
      stripePurchases: purchaseRow[0].count,
      stripeCents: purchaseRow[0].cents,
    },
  };
}
