import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { getDailyForToday, NoScriptAvailableError } from "@/lib/daily/get-daily";
import { deriveCreature } from "@/lib/game/creature";
import { recipeFromId } from "@/lib/game/recipe";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
const opts = { timeZone: "UTC", launchDate: "2026-09-01" };

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
});
afterAll(async () => {
  await client.close();
});

describe("getDailyForToday", () => {
  it("refuses to assemble a daily without an approved script (invariant 3)", async () => {
    await db.insert(schema.script).values({ body: "candidate only", batch: 1, status: "candidate" });
    await expect(getDailyForToday(db, { ...opts, now: new Date("2026-09-01T12:00:00Z") })).rejects.toBeInstanceOf(NoScriptAvailableError);
  });

  it("assembles a never-dark fallback once, marks it auto, and consumes the script", async () => {
    const [s] = await db.insert(schema.script).values({ body: "Please remember to defrost the chicken before Thursday.", batch: 1, status: "backlog" }).returning();
    const now = new Date("2026-09-01T12:00:00Z");
    const a = await getDailyForToday(db, { ...opts, now });
    const b = await getDailyForToday(db, { ...opts, now });
    expect(a.id).toBe(b.id);
    expect(a.status).toBe("auto");
    expect(a.dayKey).toBe("2026-09-01");
    expect(a.dayNumber).toBe(1);
    expect(a.script.id).toBe(s.id);
    expect(a.creature.name).toMatch(/^The /);
    const [used] = await db.select().from(schema.script).where(eq(schema.script.id, s.id));
    expect(used.usedOn).toBe("2026-09-01");
    expect(await db.select().from(schema.daily)).toHaveLength(1);
  });

  it("serves an approved row and flips it to published", async () => {
    const [s] = await db.insert(schema.script).values({ body: "The printer is out of paper again.", batch: 1, status: "use" }).returning();
    const recipe = recipeFromId(42);
    const derived = deriveCreature(recipe, 42);
    const [c] = await db.insert(schema.creature).values({ name: derived.name, baseAnimal: derived.baseAnimal, layers: derived.layers }).returning();
    await db.insert(schema.daily).values({ dayDate: "2026-09-02", recipeId: 42, recipe, scriptId: s.id, creatureId: c.id, status: "approved" });
    const view = await getDailyForToday(db, { ...opts, now: new Date("2026-09-02T00:00:01Z") });
    expect(view.status).toBe("published");
    expect(view.recipeId).toBe(42);
    expect(view.dayNumber).toBe(2);
    expect(view.script.body).toBe("The printer is out of paper again.");
  });
});
