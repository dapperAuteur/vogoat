import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import type { TakeAudioStore } from "@/lib/blob-store";
import { deriveCreature } from "@/lib/game/creature";
import { recipeFromId } from "@/lib/game/recipe";
import { discardTake, keepTake, registerTake, submitTake } from "@/lib/takes/core";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;

const stored = new Map<string, Uint8Array>();
const deleted: string[] = [];
const fakeStore: TakeAudioStore = {
  async put(key, bytes) {
    stored.set(`fake:${key}`, bytes);
    return `fake:${key}`;
  },
  async get(url) {
    return stored.get(url) ?? null;
  },
  async delete(url) {
    deleted.push(url);
    stored.delete(url);
  },
};

let dailyId = "";
const bytes = new Uint8Array([1, 2, 3]);
const keepArgs = { bytes, mime: "audio/webm;codecs=opus", durationMs: 7000 } as const;

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values([
    { id: "free1", name: "Free", email: "free@example.com" },
    { id: "paid1", name: "Paid", email: "paid@example.com", plan: "lifetime" },
  ]);
  const [s] = await db.insert(schema.script).values({ body: "The bus leaves at seven forty.", batch: 1, status: "use" }).returning();
  const recipe = recipeFromId(99);
  const d = deriveCreature(recipe, 99);
  const [c] = await db.insert(schema.creature).values({ name: d.name, baseAnimal: d.baseAnimal, layers: d.layers }).returning();
  const [day] = await db.insert(schema.daily).values({ dayDate: "2026-09-01", recipeId: 99, recipe, scriptId: s.id, creatureId: c.id, status: "published" }).returning();
  dailyId = day.id;
});
afterAll(async () => {
  await client.close();
});

describe("take lifecycle", () => {
  it("free plan registers 3 attempts and no more; discarding does not refund", async () => {
    const takes: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const r = await registerTake(db, { userId: "free1", plan: "free", dailyId });
      if (!r.ok) throw new Error(r.code);
      expect(r.data.takeNumber).toBe(i);
      takes.push(r.data.takeId);
    }
    const fourth = await registerTake(db, { userId: "free1", plan: "free", dailyId });
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) expect(fourth.code).toBe("take_limit");
    // discard take 1 (never uploaded): row stays, count stays at the cap
    const d = await discardTake(db, fakeStore, { userId: "free1", takeId: takes[0] });
    expect(d.ok).toBe(true);
    expect(deleted).toHaveLength(0); // nothing was ever stored for it
    const again = await registerTake(db, { userId: "free1", plan: "free", dailyId });
    expect(again.ok).toBe(false);
  });

  it("paid plans have no attempt cap", async () => {
    for (let i = 1; i <= 4; i++) {
      const r = await registerTake(db, { userId: "paid1", plan: "lifetime", dailyId });
      expect(r.ok).toBe(true);
    }
  });

  it("keep uploads and sets a 30-day clock for free, none for lifetime", async () => {
    const r = await registerTake(db, { userId: "free1", plan: "free", dailyId });
    expect(r.ok).toBe(false); // capped; reuse an existing recorded take instead
    const rows = await db.select().from(schema.take);
    const freeRecorded = rows.find((t) => t.userId === "free1" && t.status === "recorded");
    const paidRecorded = rows.find((t) => t.userId === "paid1" && t.status === "recorded");
    if (!freeRecorded || !paidRecorded) throw new Error("missing recorded takes");
    const kept = await keepTake(db, fakeStore, { userId: "free1", plan: "free", takeId: freeRecorded.id, ...keepArgs });
    if (!kept.ok) throw new Error(kept.code);
    expect(kept.data.hasAudio).toBe(true);
    const keptPaid = await keepTake(db, fakeStore, { userId: "paid1", plan: "lifetime", takeId: paidRecorded.id, ...keepArgs });
    expect(keptPaid.ok).toBe(true);
    const after = await db.select().from(schema.take);
    expect(after.find((t) => t.id === freeRecorded.id)?.expiresAt).not.toBeNull();
    expect(after.find((t) => t.id === paidRecorded.id)?.expiresAt).toBeNull();
    expect(stored.size).toBe(2);
  });

  it("rejects oversized, overlong, and non-audio keeps", async () => {
    const r = await registerTake(db, { userId: "paid1", plan: "lifetime", dailyId });
    if (!r.ok) throw new Error(r.code);
    const big = await keepTake(db, fakeStore, { userId: "paid1", plan: "lifetime", takeId: r.data.takeId, bytes: new Uint8Array(3_000_000), mime: "audio/webm", durationMs: 7000 });
    expect(!big.ok && big.code).toBe("too_large");
    const long = await keepTake(db, fakeStore, { userId: "paid1", plan: "lifetime", takeId: r.data.takeId, bytes, mime: "audio/webm", durationMs: 45_000 });
    expect(!long.ok && long.code).toBe("too_long");
    const video = await keepTake(db, fakeStore, { userId: "paid1", plan: "lifetime", takeId: r.data.takeId, bytes, mime: "video/mp4", durationMs: 7000 });
    expect(!video.ok && video.code).toBe("bad_mime");
  });

  it("submit works once per day, from a kept take, only for today", async () => {
    const rows = await db.select().from(schema.take);
    const kept = rows.find((t) => t.userId === "free1" && t.status === "kept");
    if (!kept) throw new Error("no kept take");
    const wrongDay = await submitTake(db, { userId: "free1", takeId: kept.id, todayKey: "2026-09-02" });
    expect(!wrongDay.ok && wrongDay.code).toBe("day_over");
    const okSubmit = await submitTake(db, { userId: "free1", takeId: kept.id, todayKey: "2026-09-01" });
    expect(okSubmit.ok).toBe(true);
    // keep another and try to submit again the same day
    const recorded = rows.find((t) => t.userId === "free1" && t.status === "recorded");
    if (!recorded) throw new Error("no spare recorded take");
    const kept2 = await keepTake(db, fakeStore, { userId: "free1", plan: "free", takeId: recorded.id, ...keepArgs });
    if (!kept2.ok) throw new Error(kept2.code);
    const second = await submitTake(db, { userId: "free1", takeId: kept2.data.id, todayKey: "2026-09-01" });
    expect(!second.ok && second.code).toBe("already_submitted");
  });

  it("discard after keep deletes from the store but keeps the row", async () => {
    const rows = await db.select().from(schema.take);
    const kept = rows.find((t) => t.userId === "paid1" && t.status === "kept");
    if (!kept) throw new Error("no kept take");
    const d = await discardTake(db, fakeStore, { userId: "paid1", takeId: kept.id });
    expect(d.ok).toBe(true);
    expect(deleted).toContain(kept.blobUrl);
    const [after] = await db.select().from(schema.take).where((await import("drizzle-orm")).eq(schema.take.id, kept.id));
    expect(after.status).toBe("discarded");
    expect(after.blobUrl).toBeNull();
    const submitted = rows.find((t) => t.userId === "free1" && t.status === "submitted");
    if (submitted) {
      const refuse = await discardTake(db, fakeStore, { userId: "free1", takeId: submitted.id });
      expect(!refuse.ok && refuse.code).toBe("wrong_state");
    }
  });
});

describe("admin overrides (BAM 2026-09-01)", () => {
  it("admin role means no attempt cap", async () => {
    const { takeLimitFor } = await import("@/lib/takes/core");
    expect(takeLimitFor("free", "admin")).toBeNull();
    expect(takeLimitFor("free", "player")).toBe(3);
  });

  it("admin resubmit replaces the previous entry; the schema invariant holds", async () => {
    const rows = await db.select().from(schema.take);
    const submitted = rows.find((t) => t.userId === "free1" && t.status === "submitted");
    const kept = rows.find((t) => t.userId === "free1" && t.status === "kept");
    if (!submitted || !kept) throw new Error("fixture missing");
    const denied = await submitTake(db, { userId: "free1", takeId: kept.id, todayKey: "2026-09-01" });
    expect(!denied.ok && denied.code).toBe("already_submitted");
    const replaced = await submitTake(db, { userId: "free1", takeId: kept.id, todayKey: "2026-09-01", allowResubmit: true });
    expect(replaced.ok).toBe(true);
    const after = await db.select().from(schema.take);
    expect(after.filter((t) => t.userId === "free1" && t.status === "submitted")).toHaveLength(1);
    expect(after.find((t) => t.id === submitted.id)?.status).toBe("kept");
  });
});
