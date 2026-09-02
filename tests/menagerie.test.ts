import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import type { TakeAudioStore } from "@/lib/blob-store";
import { deriveCreature } from "@/lib/game/creature";
import { recipeFromId } from "@/lib/game/recipe";
import { getMenagerie } from "@/lib/menagerie";
import { expireTakeAudio } from "@/lib/takes/expiry";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
const store: TakeAudioStore & { deleted: string[] } = {
  deleted: [],
  async put() {
    return "fake:x";
  },
  async get() {
    return null;
  },
  async delete(url) {
    this.deleted.push(url);
  },
};

const DAYS = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"];
const dailyIds: Record<string, string> = {};

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values({ id: "u1", name: "U", email: "u@example.com" });
  const [s] = await db.insert(schema.script).values({ body: "The umbrella is by the door.", batch: 1, status: "use" }).returning();
  for (const [i, day] of DAYS.entries()) {
    const recipeId = 100 + i;
    const recipe = recipeFromId(recipeId);
    const d = deriveCreature(recipe, recipeId);
    const [c] = await db.insert(schema.creature).values({ name: d.name, baseAnimal: d.baseAnimal, layers: d.layers }).returning();
    const [row] = await db.insert(schema.daily).values({ dayDate: day, recipeId, recipe, scriptId: s.id, creatureId: c.id, status: "published" }).returning();
    dailyIds[day] = row.id;
  }
  // submitted on day 1 and 3 (expired audio on day 1), missed day 2, day 4 = today pending
  await db.insert(schema.take).values([
    { userId: "u1", dailyId: dailyIds[DAYS[0]], takeNumber: 1, status: "submitted", blobUrl: "fake:a", expiresAt: new Date("2026-10-01T00:00:00Z") },
    { userId: "u1", dailyId: dailyIds[DAYS[2]], takeNumber: 2, status: "submitted", blobUrl: "fake:b", expiresAt: new Date("2026-11-01T00:00:00Z") },
  ]);
});
afterAll(async () => {
  await client.close();
});

describe("menagerie", () => {
  it("shows newest first with silhouettes for missed days and today pending", async () => {
    const view = await getMenagerie(db, { userId: "u1", today: "2026-09-04" });
    expect(view.entries.filter((e) => e.takeNumber !== null).every((e) => e.takeId !== null)).toBe(true);
    expect(view.entries.find((e) => e.dayKey === "2026-09-01")?.hasAudio).toBe(true);
    expect(view.entries.map((e) => [e.dayKey, e.takeNumber !== null, e.isToday])).toEqual([
      ["2026-09-04", false, true],
      ["2026-09-03", true, false],
      ["2026-09-02", false, false],
      ["2026-09-01", true, false],
    ]);
    expect(view.observed).toBe(2);
    expect(view.missed).toBe(1);
    expect(view.streaks).toEqual({ current: 1, best: 1 });
  });

  it("survives audio expiry: blob nulled, row and collection intact (invariant 8)", async () => {
    const result = await expireTakeAudio(db, store, new Date("2026-10-15T00:00:00Z"));
    expect(result).toEqual({ expired: 1, failed: 0 });
    expect(store.deleted).toEqual(["fake:a"]);
    const view = await getMenagerie(db, { userId: "u1", today: "2026-09-04" });
    expect(view.observed).toBe(2);
    expect(view.entries.find((e) => e.dayKey === "2026-09-01")?.hasAudio).toBe(false); // expired, plate stays
    const rerun = await expireTakeAudio(db, store, new Date("2026-10-15T00:00:00Z"));
    expect(rerun).toEqual({ expired: 0, failed: 0 });
  });
});
