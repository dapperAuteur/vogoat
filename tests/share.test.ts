import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { deriveCreature } from "@/lib/game/creature";
import { recipeId, type Recipe } from "@/lib/game/recipe";
import { formatShareText } from "@/lib/game/share-card";
import { createShare, getShareView, reportShare, revokeShare } from "@/lib/share/core";
import { newShareSlug } from "@/lib/share/slug";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
let submittedId = "";
let keptId = "";

const recipe: Recipe = {
  effort: "float", placement: "nasal", air: "breathy", age: "elder",
  size: "tiny", tempo: "slow", volume: "hushed", attitude: "menacing",
};

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values({ id: "u1", name: "Fielder", email: "u@example.com" });
  const [s] = await db.insert(schema.script).values({ body: "Please remember to defrost the chicken before Thursday.", batch: 1, status: "use" }).returning();
  const d = deriveCreature(recipe, recipeId(recipe), "mouse");
  const [c] = await db.insert(schema.creature).values({ name: d.name, baseAnimal: d.baseAnimal, layers: d.layers }).returning();
  const [day] = await db.insert(schema.daily).values({ dayDate: "2026-09-01", recipeId: recipeId(recipe), recipe, scriptId: s.id, creatureId: c.id, status: "published" }).returning();
  const [t1] = await db.insert(schema.take).values({ userId: "u1", dailyId: day.id, takeNumber: 2, status: "submitted", blobUrl: "fake:a", mime: "audio/webm" }).returning();
  const [t2] = await db.insert(schema.take).values({ userId: "u1", dailyId: day.id, takeNumber: 1, status: "kept", blobUrl: "fake:b" }).returning();
  submittedId = t1.id;
  keptId = t2.id;
});
afterAll(async () => {
  await client.close();
});

describe("share card text", () => {
  it("matches the PRD card with middle dots and the take flex", () => {
    expect(
      formatShareText({ dayNumber: 31, recipe, baseAnimal: "mouse", takeNumber: 2, takeLimit: 3, url: "https://vogoat.witus.online" }),
    ).toBe("VO GOAT #31 🐁 tiny · menacing · elder · hushed · float · take 2/3 · https://vogoat.witus.online");
    expect(formatShareText({ dayNumber: 7, recipe, baseAnimal: "goat", takeNumber: 7, takeLimit: null, url: "x" })).toContain("take 7 · x");
  });

  it("slugs are long, url-safe, and unique", () => {
    const slugs = new Set(Array.from({ length: 200 }, () => newShareSlug()));
    expect(slugs.size).toBe(200);
    for (const s of slugs) expect(s).toMatch(/^[A-Za-z0-9_-]{20,24}$/);
  });
});

describe("share lifecycle", () => {
  it("shares only the submitted take, idempotently", async () => {
    const no = await createShare(db, { userId: "u1", takeId: keptId });
    expect(!no.ok && no.code).toBe("wrong_state");
    const a = await createShare(db, { userId: "u1", takeId: submittedId });
    const b = await createShare(db, { userId: "u1", takeId: submittedId });
    if (!a.ok || !b.ok) throw new Error("share failed");
    expect(a.data.slug).toBe(b.data.slug);
  });

  it("serves the view with transcript, hides after revoke, new slug on re-share", async () => {
    const made = await createShare(db, { userId: "u1", takeId: submittedId });
    if (!made.ok) throw new Error("no share");
    const view = await getShareView(db, made.data.slug);
    expect(view?.creatureName).toBe("The Tiny Menacing Elder Mouse");
    expect(view?.scriptBody).toContain("defrost the chicken");
    expect(view?.audioAvailable).toBe(true);
    await revokeShare(db, { userId: "u1", takeId: submittedId });
    expect(await getShareView(db, made.data.slug)).toBeNull();
    const again = await createShare(db, { userId: "u1", takeId: submittedId });
    if (!again.ok) throw new Error("re-share failed");
    expect(again.data.slug).not.toBe(made.data.slug);
    expect(await getShareView(db, again.data.slug)).not.toBeNull();
  });

  it("expired audio keeps the card alive (PRD §5)", async () => {
    await db.update(schema.take).set({ blobUrl: null }).where(eq(schema.take.id, submittedId));
    const [row] = await db.select().from(schema.share).where(eq(schema.share.takeId, submittedId));
    const view = await getShareView(db, row.slug);
    expect(view).not.toBeNull();
    expect(view?.audioAvailable).toBe(false);
  });

  it("records reports and validates reasons", async () => {
    const [row] = await db.select().from(schema.share).where(eq(schema.share.takeId, submittedId));
    const bad = await reportShare(db, { slug: row.slug, reason: "nonsense", detail: null });
    expect(!bad.ok && bad.code).toBe("bad_input");
    const good = await reportShare(db, { slug: row.slug, reason: "other", detail: "test" });
    expect(good.ok).toBe(true);
    const reports = await db.select().from(schema.report);
    expect(reports).toHaveLength(1);
    expect(reports[0].status).toBe("open");
  });
});
