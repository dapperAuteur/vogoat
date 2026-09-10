import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import type { TakeAudioStore } from "@/lib/blob-store";
import { deriveCreature } from "@/lib/game/creature";
import { recipeFromId } from "@/lib/game/recipe";
import { expireTakeAudio } from "@/lib/takes/expiry";

// BAM, 2026-09-10: every recording on every plan is deleted after 30 days.
const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
const deleted: string[] = [];
const store: TakeAudioStore = {
  async put() {
    return "fake:x";
  },
  async get() {
    return null;
  },
  async delete(url) {
    deleted.push(url);
  },
};
const NOW = new Date("2026-10-15T00:00:00Z");
const OLD = new Date("2026-09-01T00:00:00Z"); // 44 days before NOW
const FRESH = new Date("2026-10-10T00:00:00Z"); // 5 days before NOW

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values({ id: "paid", name: "Paid", email: "p@example.com", plan: "lifetime" });
  const [s] = await db.insert(schema.script).values({ body: "Bin day is tomorrow.", batch: 1, status: "use" }).returning();
  const recipe = recipeFromId(321);
  const d = deriveCreature(recipe, 321);
  const [c] = await db.insert(schema.creature).values({ name: d.name, baseAnimal: d.baseAnimal, layers: d.layers }).returning();
  const [day] = await db.insert(schema.daily).values({ dayDate: "2026-09-01", recipeId: 321, recipe, scriptId: s.id, creatureId: c.id, status: "published" }).returning();
  await db.insert(schema.take).values([
    // A paid take from before the change: its clock was cleared on upgrade (expires_at null).
    { userId: "paid", dailyId: day.id, takeNumber: 1, status: "submitted", blobUrl: "fake:legacy", expiresAt: null, createdAt: OLD },
    { userId: "paid", dailyId: day.id, takeNumber: 2, status: "kept", blobUrl: "fake:fresh", expiresAt: null, createdAt: FRESH },
  ]);
  await db.insert(schema.practiceTake).values([
    { userId: "paid", recipeId: 9, recipe: recipeFromId(9), blobUrl: "fake:practice-old", createdAt: OLD },
    { userId: "paid", recipeId: 10, recipe: recipeFromId(10), blobUrl: "fake:practice-fresh", createdAt: FRESH },
  ]);
});
afterAll(async () => {
  await client.close();
});

describe("30-day retention on every plan", () => {
  it("expires legacy unclocked paid takes and old practice takes, keeps fresh ones", async () => {
    const result = await expireTakeAudio(db, store, NOW);
    expect(result).toEqual({ expired: 1, practiceExpired: 1, failed: 0 });
    expect(deleted.sort()).toEqual(["fake:legacy", "fake:practice-old"]);

    const takes = await db.select().from(schema.take);
    const legacy = takes.find((t) => t.takeNumber === 1);
    expect(legacy?.blobUrl).toBeNull();
    expect(legacy?.status).toBe("submitted"); // the Guild row survives
    expect(takes.find((t) => t.takeNumber === 2)?.blobUrl).toBe("fake:fresh");

    const [oldPractice] = await db.select().from(schema.practiceTake).where(eq(schema.practiceTake.recipeId, 9));
    expect(oldPractice.blobUrl).toBeNull();
    expect(oldPractice.deletedAt).not.toBeNull();
    const [freshPractice] = await db.select().from(schema.practiceTake).where(eq(schema.practiceTake.recipeId, 10));
    expect(freshPractice.blobUrl).toBe("fake:practice-fresh");

    expect(await expireTakeAudio(db, store, NOW)).toEqual({ expired: 0, practiceExpired: 0, failed: 0 });
  });
});
