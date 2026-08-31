import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import { deriveCreature } from "@/lib/game/creature";
import { recipeFromId } from "@/lib/game/recipe";

// The load-bearing invariants live in the schema (CLAUDE.md #1, #8), so they are tested
// against a real Postgres: an in-memory PGlite with the generated migrations applied.
const client = new PGlite();
const db = drizzle(client, { schema });


/** Drizzle wraps driver errors; the constraint name lives down the `cause` chain. */
async function violation(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "";
  } catch (error: unknown) {
    const messages: string[] = [];
    let current: unknown = error;
    while (current instanceof Error) {
      messages.push(current.message);
      current = current.cause;
    }
    return messages.join(" | ");
  }
}

let dailyId = "";
const userId = "user_test_1";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values({ id: userId, name: "Test", email: "test@example.com" });
  const [s] = await db.insert(schema.script).values({ body: "Please remember to defrost the chicken before Thursday.", status: "use", batch: 1 }).returning();
  const recipe = recipeFromId(6432);
  const derived = deriveCreature(recipe, 6432);
  const [c] = await db.insert(schema.creature).values({ name: derived.name, baseAnimal: derived.baseAnimal, layers: derived.layers }).returning();
  const [d] = await db.insert(schema.daily).values({ dayDate: "2026-09-01", recipeId: 6432, recipe, scriptId: s.id, creatureId: c.id, status: "approved" }).returning();
  dailyId = d.id;
});

afterAll(async () => {
  await client.close();
});

describe("schema invariants", () => {
  it("allows exactly one submitted take per user per day, for any tier", async () => {
    await db.insert(schema.take).values({ userId, dailyId, takeNumber: 1, status: "submitted", blobUrl: "blob://1" });
    expect(
      await violation(db.insert(schema.take).values({ userId, dailyId, takeNumber: 2, status: "submitted", blobUrl: "blob://2" })),
    ).toMatch(/take_one_submission_per_day_uq/);
  });

  it("keeps take numbers unique per user and day (the attempt cap)", async () => {
    expect(await violation(db.insert(schema.take).values({ userId, dailyId, takeNumber: 1, status: "recorded" }))).toMatch(
      /take_user_daily_number_uq/,
    );
  });

  it("expiry nulls the blob and keeps the row (the Menagerie survives)", async () => {
    await db.update(schema.take).set({ blobUrl: null }).where(eq(schema.take.takeNumber, 1));
    const rows = await db.select().from(schema.take).where(eq(schema.take.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].blobUrl).toBeNull();
    expect(rows[0].status).toBe("submitted");
  });

  it("uses one daily per calendar date", async () => {
    await expect(
      db.insert(schema.daily).values({ dayDate: "2026-09-01", recipeId: 7, recipe: recipeFromId(7), scriptId: (await db.select().from(schema.script))[0].id, creatureId: (await db.select().from(schema.creature))[0].id }),
    ).rejects.toThrow();
  });
});
