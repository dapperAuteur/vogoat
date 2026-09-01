import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import type { DayKey } from "@/lib/game/day";
import { getWorkshopAssignment, saveWorkshopEntry, workshopStreaks } from "@/lib/workshop/core";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values({ id: "bam", name: "BAM", email: "bam@example.com", role: "admin" });
  await db.insert(schema.literaryDevice).values([
    { name: "Anaphora", definition: "d1", example1: "a", example2: "b", example3: "c" },
    { name: "Litotes", definition: "d2", example1: "a", example2: "b", example3: "c" },
    { name: "Zeugma", definition: "d3", example1: "a", example2: "b", example3: "c" },
  ]);
});
afterAll(async () => {
  await client.close();
});

describe("the shuffled no-repeat cycle (PRD §9)", () => {
  it("assigns deterministically per date and never repeats within a cycle", async () => {
    const days: DayKey[] = ["2026-09-01", "2026-09-02", "2026-09-03"] as DayKey[];
    const seen: string[] = [];
    for (const day of days) {
      const a = await getWorkshopAssignment(db, day);
      const b = await getWorkshopAssignment(db, day);
      if (!a || !b) throw new Error("no assignment");
      expect(a.device.id).toBe(b.device.id);
      expect(a.cycle).toBe(1);
      seen.push(a.device.id);
    }
    expect(new Set(seen).size).toBe(3);
    // all 3 used → day 4 starts cycle 2
    const d4 = await getWorkshopAssignment(db, "2026-09-04" as DayKey);
    expect(d4?.cycle).toBe(2);
  });
});

describe("entries and the loop-closer", () => {
  it("upserts the day's entry and computes the writing streak", async () => {
    const a = await getWorkshopAssignment(db, "2026-09-01" as DayKey);
    if (!a) throw new Error("no assignment");
    const first = await saveWorkshopEntry(db, { userId: "bam", dayKey: "2026-09-01" as DayKey, deviceId: a.device.id, body: "Draft one.", isScriptCandidate: false });
    expect(first.ok).toBe(true);
    const second = await saveWorkshopEntry(db, { userId: "bam", dayKey: "2026-09-01" as DayKey, deviceId: a.device.id, body: "Draft two, better.", isScriptCandidate: false });
    expect(second.ok).toBe(true);
    const rows = await db.select().from(schema.workshopEntry);
    expect(rows).toHaveLength(1);
    expect(rows[0].body).toBe("Draft two, better.");
    expect(await workshopStreaks(db, "bam", "2026-09-01" as DayKey)).toEqual({ current: 1, best: 1 });
    const empty = await saveWorkshopEntry(db, { userId: "bam", dayKey: "2026-09-01" as DayKey, deviceId: a.device.id, body: "   ", isScriptCandidate: false });
    expect(!empty.ok && empty.code).toBe("empty");
  });

  it("flags into script triage once, updates while candidate, retracts on unflag", async () => {
    const a = await getWorkshopAssignment(db, "2026-09-02" as DayKey);
    if (!a) throw new Error("no assignment");
    const args = { userId: "bam", dayKey: "2026-09-02" as DayKey, deviceId: a.device.id };
    await saveWorkshopEntry(db, { ...args, body: "Please water the fern.", isScriptCandidate: true });
    await saveWorkshopEntry(db, { ...args, body: "Please water the fern. It knows.", isScriptCandidate: true });
    let candidates = await db.select().from(schema.script).where(eq(schema.script.batch, 0));
    expect(candidates).toHaveLength(1);
    expect(candidates[0].body).toBe("Please water the fern. It knows.");
    expect(candidates[0].status).toBe("candidate");
    await saveWorkshopEntry(db, { ...args, body: "Please water the fern. It knows.", isScriptCandidate: false });
    candidates = await db.select().from(schema.script).where(eq(schema.script.batch, 0));
    expect(candidates).toHaveLength(0);
    // re-flag then triage: unflagging no longer retracts
    await saveWorkshopEntry(db, { ...args, body: "Final fern line.", isScriptCandidate: true });
    const [c] = await db.select().from(schema.script).where(eq(schema.script.batch, 0));
    await db.update(schema.script).set({ status: "use" }).where(eq(schema.script.id, c.id));
    await saveWorkshopEntry(db, { ...args, body: "Final fern line.", isScriptCandidate: false });
    expect(await db.select().from(schema.script).where(eq(schema.script.batch, 0))).toHaveLength(1);
  });
});
