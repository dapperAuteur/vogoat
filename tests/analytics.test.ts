import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { funnelRates, getAnalyticsReport, habitFromSubmissions, median } from "@/lib/analytics/queries";
import { deriveCreature } from "@/lib/game/creature";
import type { DayKey } from "@/lib/game/day";
import { recipeFromId } from "@/lib/game/recipe";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;

// A ten-day window ending "today". Fixture shape (players p1..p4, admin a1):
//   p1 submits days 1, 2, 3 and 10  → an early run, a gap, a live current streak of 1
//   p2 submits day 1 only           → in the D7 cohort, never came back
//   p3 submits days 9 and 10        → current streak of 2
//   p4 registers takes on day 10, keeps one, submits nothing → the drop-off
//   a1 (admin) submits every day    → must not appear in any player number
const TODAY = "2026-09-10" as DayKey;
const DAYS = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"];
const dailyIds: Record<string, string> = {};

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values([
    { id: "p1", name: "P1", email: "p1@example.com" },
    { id: "p2", name: "P2", email: "p2@example.com", plan: "lifetime" },
    { id: "p3", name: "P3", email: "p3@example.com" },
    { id: "p4", name: "P4", email: "p4@example.com" },
    { id: "a1", name: "Admin", email: "a1@example.com", role: "admin" },
  ]);
  const [script] = await db
    .insert(schema.script)
    .values({ body: "The umbrella is by the door.", batch: 1, status: "use" })
    .returning();
  for (const [i, day] of DAYS.entries()) {
    const recipeId = 200 + i;
    const recipe = recipeFromId(recipeId);
    const derived = deriveCreature(recipe, recipeId);
    const [creature] = await db
      .insert(schema.creature)
      .values({ name: derived.name, baseAnimal: derived.baseAnimal, layers: derived.layers })
      .returning();
    const [row] = await db
      .insert(schema.daily)
      .values({
        dayDate: day,
        recipeId,
        recipe,
        scriptId: script.id,
        creatureId: creature.id,
        // Day 4 was authored but never loaded: it does not count as served.
        status: i === 3 ? "draft" : "published",
      })
      .returning();
    dailyIds[day] = row.id;
  }

  const on = (day: string) => dailyIds[day];
  await db.insert(schema.take).values([
    // p1: submitted on take 2 twice, take 1 once, take 3 once (with the discards that got there)
    { userId: "p1", dailyId: on(DAYS[0]), takeNumber: 1, status: "discarded" },
    { userId: "p1", dailyId: on(DAYS[0]), takeNumber: 2, status: "submitted", blobUrl: "fake:1" },
    { userId: "p1", dailyId: on(DAYS[1]), takeNumber: 1, status: "submitted", blobUrl: "fake:2" },
    { userId: "p1", dailyId: on(DAYS[2]), takeNumber: 1, status: "discarded" },
    { userId: "p1", dailyId: on(DAYS[2]), takeNumber: 2, status: "discarded" },
    { userId: "p1", dailyId: on(DAYS[2]), takeNumber: 3, status: "submitted", blobUrl: "fake:3" },
    { userId: "p1", dailyId: on(DAYS[9]), takeNumber: 1, status: "discarded" },
    { userId: "p1", dailyId: on(DAYS[9]), takeNumber: 2, status: "submitted", blobUrl: "fake:4" },
    // p2: one submission on day 1, then gone
    { userId: "p2", dailyId: on(DAYS[0]), takeNumber: 1, status: "submitted", blobUrl: "fake:5" },
    // p3: days 9 and 10
    { userId: "p3", dailyId: on(DAYS[8]), takeNumber: 1, status: "submitted", blobUrl: "fake:6" },
    { userId: "p3", dailyId: on(DAYS[9]), takeNumber: 1, status: "submitted", blobUrl: "fake:7" },
    // p4: started today, kept, never submitted
    { userId: "p4", dailyId: on(DAYS[9]), takeNumber: 1, status: "discarded" },
    { userId: "p4", dailyId: on(DAYS[9]), takeNumber: 2, status: "kept", blobUrl: "fake:8" },
    // admin: submits every day, must be invisible to the player numbers
    ...DAYS.map((day) => ({ userId: "a1", dailyId: on(day), takeNumber: 1, status: "submitted" as const, blobUrl: "fake:a" })),
  ]);

  // Feature usage: two share links (one revoked), one report, practice + workshop by one account.
  const submitted = await db.select().from(schema.take);
  const p1Takes = submitted.filter((t) => t.userId === "p1" && t.status === "submitted");
  const [shareA] = await db.insert(schema.share).values({ takeId: p1Takes[0].id, slug: "aaaaaaaa" }).returning();
  await db.insert(schema.share).values({ takeId: p1Takes[1].id, slug: "bbbbbbbb", revokedAt: new Date() });
  await db.insert(schema.report).values({ shareId: shareA.id, reason: "other" });
  await db
    .insert(schema.practiceTake)
    .values({ userId: "p2", recipeId: 300, recipe: recipeFromId(300) });
  const [device] = await db
    .insert(schema.literaryDevice)
    .values({ name: "Alliteration", definition: "d", example1: "a", example2: "b", example3: "c" })
    .returning();
  await db
    .insert(schema.workshopEntry)
    .values({ userId: "a1", dayDate: DAYS[9], deviceId: device.id, body: "A line." });
});

afterAll(async () => {
  await client.close();
});

describe("analytics report", () => {
  it("counts the PRD §15 funnel and excludes admins from player numbers", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    const all = report.funnel.all;
    // 10 dailies exist, but day 4 is still a draft: it was never served.
    expect(all.dailiesServed).toBe(9);
    // 13 player take rows; the admin's 10 are excluded.
    expect(all.takesRegistered).toBe(13);
    expect(all.playersWhoStarted).toBe(4);
    // kept-or-submitted: 7 submissions + p4's one kept take
    expect(all.keptTakes).toBe(8);
    expect(all.submittedTakes).toBe(7);
    expect(all.playersWhoSubmitted).toBe(3);
    // (player, day) pairs: p1 four, p2 one, p3 two, p4 one
    expect(all.playerDays).toBe(8);
  });

  it("windows by VoGoat day, not wall clock", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    // last 7 = 2026-09-04 .. 2026-09-10: only days 9 and 10 carry takes
    expect(report.windowStart7).toBe("2026-09-04");
    expect(report.funnel.last7.submittedTakes).toBe(3);
    expect(report.funnel.last7.playersWhoSubmitted).toBe(2);
    expect(report.funnel.last7.takesRegistered).toBe(6); // p3 day 9; p1 x2, p3, p4 x2 on day 10
    // last 30 covers the whole fixture
    expect(report.funnel.last30).toEqual(report.funnel.all);
  });

  it("reports the take-number distribution and the average", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    expect(report.usage.takeNumbers).toEqual([
      { takeNumber: 1, submissions: 4 },
      { takeNumber: 2, submissions: 2 },
      { takeNumber: 3, submissions: 1 },
    ]);
    // (1*4 + 2*2 + 3*1) / 7
    expect(report.usage.avgSubmittedTakeNumber).toBeCloseTo(11 / 7, 6);
  });

  it("computes the 14-day submitter series zero-filled", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    expect(report.habit.series).toHaveLength(14);
    expect(report.habit.series[0].dayKey).toBe("2026-08-28");
    expect(report.habit.series[13].dayKey).toBe(TODAY);
    const byDay = Object.fromEntries(report.habit.series.map((s) => [s.dayKey, s.submitters]));
    expect(byDay["2026-09-01"]).toBe(2); // p1 and p2
    expect(byDay["2026-09-04"]).toBe(0);
    expect(byDay["2026-09-10"]).toBe(2); // p1 and p3
  });

  it("computes streaks and D7 return from submitted days", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    const habit = report.habit;
    expect(habit.streakPopulation).toBe(3);
    // current: p1 = 1 (only today), p2 = 0, p3 = 2 (days 9 and 10)
    expect(habit.medianCurrentStreak).toBe(1);
    expect(habit.maxCurrentStreak).toBe(2);
    // best: p1 ran days 1-3
    expect(habit.maxBestStreak).toBe(3);
    // cohort = first submission on or before 2026-09-03: p1 and p2. Only p1 came back.
    expect(habit.d7Cohort).toBe(2);
    expect(habit.d7Returned).toBe(1);
    expect(habit.d7Rate).toBe(0.5);
  });

  it("counts what people use versus avoid", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    expect(report.usage.sharesCreated).toBe(2);
    expect(report.usage.sharesRevoked).toBe(1);
    expect(report.usage.sharesLive).toBe(1);
    expect(report.usage.reportsFiled).toBe(1);
    expect(report.usage.reportsOpen).toBe(1);
    expect(report.usage.practiceTakes).toBe(1);
    expect(report.usage.practiceUsers).toBe(1);
    expect(report.usage.workshopEntries).toBe(1);
    expect(report.usage.workshopWriters).toBe(1);
  });

  it("splits the population by plan without counting the admin as a player", async () => {
    const report = await getAnalyticsReport(db, TODAY);
    expect(report.population.players).toBe(4);
    expect(report.population.admins).toBe(1);
    const free = report.population.plans.find((p) => p.plan === "free");
    const lifetime = report.population.plans.find((p) => p.plan === "lifetime");
    expect(free?.players).toBe(3);
    expect(lifetime?.players).toBe(1);
    expect(report.population.stripePurchases).toBe(0);
  });
});

describe("pure helpers", () => {
  it("guards every ratio against a zero denominator", () => {
    const empty = {
      dailiesServed: 0,
      takesRegistered: 0,
      playersWhoStarted: 0,
      keptTakes: 0,
      submittedTakes: 0,
      playersWhoSubmitted: 0,
      playerDays: 0,
    };
    expect(funnelRates(empty)).toEqual({ keepRate: null, submitRate: null, startToSubmit: null, playerDropOff: null });
    const some = { ...empty, takesRegistered: 10, keptTakes: 5, submittedTakes: 2, playersWhoStarted: 4, playersWhoSubmitted: 1 };
    const rates = funnelRates(some);
    expect(rates.keepRate).toBe(0.5);
    expect(rates.submitRate).toBe(0.4);
    expect(rates.startToSubmit).toBe(0.2);
    expect(rates.playerDropOff).toBe(0.75);
  });

  it("takes a median of an even list without inventing a fraction", () => {
    expect(median([])).toBe(0);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3); // rounds the midpoint average
  });

  it("treats a repeated day as one day for streak math", () => {
    const habit = habitFromSubmissions(
      [
        { userId: "x", dayKey: "2026-09-09" },
        { userId: "x", dayKey: "2026-09-09" },
        { userId: "x", dayKey: "2026-09-10" },
      ],
      TODAY,
    );
    expect(habit.maxCurrentStreak).toBe(2);
    expect(habit.streakPopulation).toBe(1);
  });
});
