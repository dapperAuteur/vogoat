import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { applyLifetimePurchase, applySubscriptionActive, applySubscriptionLapsed, isFounder, lifetimeSoldCount } from "@/lib/billing/core";
import { annualUnlocked } from "@/lib/billing/prices";
import { deriveCreature } from "@/lib/game/creature";
import { recipeFromId } from "@/lib/game/recipe";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
let dailyId = "";

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await db.insert(schema.user).values([
    { id: "buyer", name: "Buyer", email: "b@example.com" },
    { id: "subber", name: "Subber", email: "s@example.com" },
  ]);
  const [s] = await db.insert(schema.script).values({ body: "Preheat the oven to three fifty.", batch: 1, status: "use" }).returning();
  const recipe = recipeFromId(500);
  const d = deriveCreature(recipe, 500);
  const [c] = await db.insert(schema.creature).values({ name: d.name, baseAnimal: d.baseAnimal, layers: d.layers }).returning();
  const [day] = await db.insert(schema.daily).values({ dayDate: "2026-09-01", recipeId: 500, recipe, scriptId: s.id, creatureId: c.id, status: "published" }).returning();
  dailyId = day.id;
  await db.insert(schema.take).values([
    { userId: "buyer", dailyId, takeNumber: 1, status: "kept", blobUrl: "fake:1", expiresAt: new Date("2026-10-01") },
    { userId: "subber", dailyId, takeNumber: 1, status: "submitted", blobUrl: "fake:2", expiresAt: null },
  ]);
});
afterAll(async () => {
  await client.close();
});

describe("lifetime purchase", () => {
  it("applies once, upgrades the plan, clears expiry clocks; retries are duplicates", async () => {
    const args = { userId: "buyer", checkoutId: "cs_1", amountCents: 10_329, currency: "usd", stripeCustomerId: "cus_1" };
    expect(await applyLifetimePurchase(db, args)).toBe("applied");
    expect(await applyLifetimePurchase(db, args)).toBe("duplicate");
    const [buyer] = await db.select().from(schema.user).where(eq(schema.user.id, "buyer"));
    expect(buyer.plan).toBe("lifetime");
    const takes = await db.select().from(schema.take).where(eq(schema.take.userId, "buyer"));
    expect(takes[0].expiresAt).toBeNull();
    expect(await lifetimeSoldCount(db)).toBe(1);
    expect(await isFounder(db, "buyer")).toBe(true);
    expect(await applyLifetimePurchase(db, { ...args, userId: "ghost", checkoutId: "cs_2" })).toBe("no_user");
  });

  it("annual gate opens at 100", () => {
    expect(annualUnlocked(99)).toBe(false);
    expect(annualUnlocked(100)).toBe(true);
  });
});

describe("subscriptions and the lapse policy", () => {
  it("activates a subscriber but never downgrades a lifetime account", async () => {
    expect(await applySubscriptionActive(db, { userId: "subber", stripeCustomerId: "cus_s" })).toBe(true);
    const [subber] = await db.select().from(schema.user).where(eq(schema.user.id, "subber"));
    expect(subber.plan).toBe("subscriber");
    expect(await applySubscriptionActive(db, { userId: "buyer", stripeCustomerId: "cus_x" })).toBe(false);
    const [buyer] = await db.select().from(schema.user).where(eq(schema.user.id, "buyer"));
    expect(buyer.plan).toBe("lifetime");
  });

  it("lapse drops to free and starts 30-day clocks on unclocked audio; menagerie rows stay", async () => {
    const now = new Date("2026-09-10T00:00:00Z");
    expect(await applySubscriptionLapsed(db, { stripeCustomerId: "cus_s", now })).toBe(true);
    const [subber] = await db.select().from(schema.user).where(eq(schema.user.id, "subber"));
    expect(subber.plan).toBe("free");
    const takes = await db.select().from(schema.take).where(eq(schema.take.userId, "subber"));
    expect(takes[0].expiresAt?.toISOString()).toBe("2026-10-10T00:00:00.000Z");
    expect(takes[0].status).toBe("submitted");
    expect(await applySubscriptionLapsed(db, { stripeCustomerId: "cus_unknown", now })).toBe(false);
  });
});

describe("cash app claims (manual $100 flow)", () => {
  it("claims once, verifies into a founder grant, and blocks double-pending", async () => {
    const { latestClaim, listClaims, resolveClaim, submitCashAppClaim } = await import("@/lib/billing/cashapp");
    await db.insert(schema.user).values({ id: "qr", name: "QR", email: "qr@example.com" });
    const first = await submitCashAppClaim(db, { userId: "qr", cashAppName: "$bamfan" });
    expect(first.ok).toBe(true);
    const dup = await submitCashAppClaim(db, { userId: "qr", cashAppName: "$bamfan" });
    expect(!dup.ok && dup.code).toBe("pending");
    const claim = await latestClaim(db, "qr");
    if (!claim) throw new Error("no claim");
    const resolved = await resolveClaim(db, { claimId: claim.id, action: "verified" });
    expect(resolved.ok).toBe(true);
    const [account] = await db.select().from(schema.user).where(eq(schema.user.id, "qr"));
    expect(account.plan).toBe("lifetime");
    expect(await isFounder(db, "qr")).toBe(true);
    const again = await resolveClaim(db, { claimId: claim.id, action: "verified" });
    expect(!again.ok && again.code).toBe("wrong_state");
    const blocked = await submitCashAppClaim(db, { userId: "qr", cashAppName: "$bamfan" });
    expect(!blocked.ok && blocked.code).toBe("already");
    expect((await listClaims(db)).length).toBe(1);
  });
});

describe("error log", () => {
  it("persists trimmed events and lists newest first", async () => {
    const { logAppError, recentErrors } = await import("@/lib/errors/log");
    await logAppError(db, { source: "server", message: "TypeError: boom", digest: "abc123", path: "/api/health" });
    await logAppError(db, { source: "client", message: "x".repeat(900), path: "/" });
    const rows = await recentErrors(db, 10);
    expect(rows[0].source).toBe("client");
    expect(rows[0].message.length).toBe(500);
    expect(rows[1].digest).toBe("abc123");
  });
});
