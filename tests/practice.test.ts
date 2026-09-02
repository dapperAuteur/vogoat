import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import type { TakeAudioStore } from "@/lib/blob-store";
import { deletePracticeTake, listPracticeTakes, savePracticeTake } from "@/lib/practice/core";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
const stored = new Map<string, Uint8Array>();
const store: TakeAudioStore = {
  async put(key, bytes) {
    stored.set(key, bytes);
    return `fake:${key}`;
  },
  async get() {
    return null;
  },
  async delete(url) {
    stored.delete(url.replace("fake:", ""));
  },
};
const args = { bytes: new Uint8Array([1, 2, 3]), mime: "audio/webm;codecs=opus", durationMs: 5000 };

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values([
    { id: "free", name: "Free", email: "f@example.com" },
    { id: "paid", name: "Paid", email: "p@example.com", plan: "lifetime" },
  ]);
});
afterAll(async () => {
  await client.close();
});

describe("practice takes", () => {
  it("is a paid feature and validates the recording", async () => {
    const denied = await savePracticeTake(db, store, { userId: "free", plan: "free", recipeId: 42, ...args });
    expect(!denied.ok && denied.code).toBe("paid_only");
    const badRecipe = await savePracticeTake(db, store, { userId: "paid", plan: "lifetime", recipeId: 99_999, ...args });
    expect(!badRecipe.ok && badRecipe.code).toBe("bad_input");
    const tooLong = await savePracticeTake(db, store, { userId: "paid", plan: "lifetime", recipeId: 42, ...args, durationMs: 60_000 });
    expect(!tooLong.ok && tooLong.code).toBe("too_long");
  });

  it("saves, lists, and deletes without touching the daily game", async () => {
    const saved = await savePracticeTake(db, store, { userId: "paid", plan: "lifetime", recipeId: 42, ...args });
    if (!saved.ok) throw new Error(saved.code);
    const rows = await listPracticeTakes(db, "paid");
    expect(rows).toHaveLength(1);
    expect(rows[0].blobUrl).toMatch(/^fake:practice-/);
    expect(await db.select().from(schema.take)).toHaveLength(0);
    const gone = await deletePracticeTake(db, store, { userId: "paid", id: saved.data.id });
    expect(gone.ok).toBe(true);
    expect(await listPracticeTakes(db, "paid")).toHaveLength(0);
    const [row] = await db.select().from(schema.practiceTake).where(eq(schema.practiceTake.id, saved.data.id));
    expect(row.blobUrl).toBeNull();
    expect(row.deletedAt).not.toBeNull();
  });

  it("rolls the row back if storage fails", async () => {
    const failing: TakeAudioStore = { put: async () => { throw new Error("no store"); }, get: async () => null, delete: async () => undefined };
    const result = await savePracticeTake(db, failing, { userId: "paid", plan: "lifetime", recipeId: 7, ...args });
    expect(!result.ok && result.code).toBe("storage_unavailable");
    expect(await listPracticeTakes(db, "paid")).toHaveLength(0);
  });
});
