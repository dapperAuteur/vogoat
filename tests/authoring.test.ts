import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { approveDaily, extendQueue, getRunway, rerollCreature, rerollRecipe, revertDailyToDraft, swapScript } from "@/lib/authoring/core";
import { ANIMALS_BY_SIZE } from "@/lib/game/creature";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
const TODAY = "2026-09-01";

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.script).values([
    { body: "Script A.", batch: 1, status: "use" },
    { body: "Script B.", batch: 1, status: "use" },
    { body: "Script C.", batch: 1, status: "backlog" },
    { body: "Never script.", batch: 1, status: "never" },
  ]);
});
afterAll(async () => {
  await client.close();
});

describe("authoring queue", () => {
  it("extends only as far as the approved script pool allows", async () => {
    const result = await extendQueue(db, { today: TODAY, days: 5 });
    if (!result.ok) throw new Error(result.code);
    expect(result.data).toEqual({ created: 3, skippedNoScript: 2 });
    const dailies = await db.select().from(schema.daily);
    expect(dailies).toHaveLength(3);
    expect(new Set(dailies.map((d) => d.recipeId)).size).toBe(3);
    expect(dailies.every((d) => d.status === "draft")).toBe(true);
    const scripts = await db.select().from(schema.script);
    expect(scripts.filter((s) => s.usedOn !== null)).toHaveLength(3);
    // idempotent for existing dates
    const again = await extendQueue(db, { today: TODAY, days: 3 });
    expect(again.ok && again.data.created).toBe(0);
  });

  it("computes the consecutive runway and approve/revert transitions", async () => {
    expect((await getRunway(db, TODAY)).consecutive).toBe(0);
    const dailies = await db.select().from(schema.daily).orderBy(schema.daily.dayDate);
    await approveDaily(db, dailies[0].id);
    await approveDaily(db, dailies[1].id);
    const runway = await getRunway(db, TODAY);
    expect(runway.consecutive).toBe(2);
    expect(runway.drafts).toBe(1);
    // approving day 3 while day 2 approved → 3 consecutive; revert the middle → 1
    await approveDaily(db, dailies[2].id);
    expect((await getRunway(db, TODAY)).consecutive).toBe(3);
    await revertDailyToDraft(db, dailies[1].id);
    expect((await getRunway(db, TODAY)).consecutive).toBe(1);
    const wrong = await approveDaily(db, dailies[0].id);
    expect(!wrong.ok && wrong.code).toBe("wrong_state");
    await revertDailyToDraft(db, dailies[0].id);
    await revertDailyToDraft(db, dailies[2].id);
  });

  it("rerolls the creature within the size class and the recipe to an unused one", async () => {
    const [d] = await db.select().from(schema.daily).orderBy(schema.daily.dayDate);
    const before = await db.select().from(schema.creature).where(eq(schema.creature.id, d.creatureId));
    const rerolled = await rerollCreature(db, d.id);
    if (!rerolled.ok) throw new Error(rerolled.code);
    const after = await db.select().from(schema.creature).where(eq(schema.creature.id, d.creatureId));
    expect(after[0].baseAnimal).not.toBe(before[0].baseAnimal);
    const cls = ANIMALS_BY_SIZE[d.recipe.size] as readonly string[];
    expect(cls).toContain(after[0].baseAnimal);

    const beforeRecipe = d.recipeId;
    const r2 = await rerollRecipe(db, d.id);
    if (!r2.ok) throw new Error(r2.code);
    expect(r2.data.recipeId).not.toBe(beforeRecipe);
    const [d2] = await db.select().from(schema.daily).where(eq(schema.daily.id, d.id));
    expect(d2.recipeId).toBe(r2.data.recipeId);
  });

  it("swaps to an approved unused script and releases the old one", async () => {
    const dailies = await db.select().from(schema.daily).orderBy(schema.daily.dayDate);
    const target = dailies[0];
    const [spare] = await db.insert(schema.script).values({ body: "Spare script.", batch: 2, status: "use" }).returning();
    const [never] = await db.select().from(schema.script).where(eq(schema.script.status, "never"));
    const bad = await swapScript(db, target.id, never.id);
    expect(!bad.ok && bad.code).toBe("bad_script");
    const oldScriptId = target.scriptId;
    const good = await swapScript(db, target.id, spare.id);
    expect(good.ok).toBe(true);
    const [released] = await db.select().from(schema.script).where(eq(schema.script.id, oldScriptId));
    expect(released.usedOn).toBeNull();
    const [used] = await db.select().from(schema.script).where(eq(schema.script.id, spare.id));
    expect(used.usedOn).toBe(target.dayDate);
  });
});
