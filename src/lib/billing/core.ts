import { and, eq, isNull, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { pendingPurchase, purchase, user } from "@/db/schema";

// Plan changes driven by Stripe webhooks. Money buys practice, retention, and tools;
// NEVER extra entries into the shared daily (invariant 1 lives in the schema regardless).

export async function lifetimeSoldCount(db: Db): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(purchase).where(eq(purchase.kind, "lifetime"));
  return n;
}

/** checkout.session.completed in payment mode: record the founder purchase, upgrade the plan. */
export async function applyLifetimePurchase(
  db: Db,
  args: { userId: string; checkoutId: string; amountCents: number; currency: string; stripeCustomerId: string | null },
): Promise<"applied" | "duplicate" | "no_user"> {
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.id, args.userId));
  if (!account) return "no_user";
  try {
    await db.insert(purchase).values({
      userId: args.userId,
      kind: "lifetime",
      stripeCheckoutId: args.checkoutId,
      amount: args.amountCents,
      currency: args.currency,
    });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) return "duplicate"; // webhook retries are routine
    throw error;
  }
  await db
    .update(user)
    .set({ plan: "lifetime", ...(args.stripeCustomerId ? { stripeCustomerId: args.stripeCustomerId } : {}) })
    .where(eq(user.id, args.userId));
  return "applied";
}

/** Subscription became active (monthly or annual). Audio keeps its 30-day clock on every plan. */
export async function applySubscriptionActive(db: Db, args: { userId: string; stripeCustomerId: string }): Promise<boolean> {
  const rows = await db
    .update(user)
    .set({ plan: "subscriber", stripeCustomerId: args.stripeCustomerId })
    .where(and(eq(user.id, args.userId), inArray(user.plan, ["free", "subscriber"])))
    .returning({ id: user.id });
  if (rows.length === 0) return false; // lifetime outranks a subscription; never downgrade
  return true;
}

/**
 * Lapse policy: the account drops to free rules. Audio needs no new clock, because every
 * recording on every plan is already deleted 30 days after the take (BAM, 2026-09-10).
 */
export async function applySubscriptionLapsed(db: Db, args: { stripeCustomerId: string; now: Date }): Promise<boolean> {
  const rows = await db
    .update(user)
    .set({ plan: "free" })
    .where(and(eq(user.stripeCustomerId, args.stripeCustomerId), eq(user.plan, "subscriber")))
    .returning({ id: user.id });
  const account = rows[0];
  return Boolean(account); // unknown customer, or a lifetime account: nothing lapses
}

/**
 * A lifetime payment with no account yet (BAM: "purchase first, then allow login"). Stored
 * against the paying email and granted the moment an account with that email appears.
 */
export async function recordPendingPurchase(
  db: Db,
  args: { email: string; checkoutId: string; amountCents: number; currency: string },
): Promise<"stored" | "duplicate"> {
  try {
    await db.insert(pendingPurchase).values({
      email: args.email.trim().toLowerCase(),
      kind: "lifetime",
      stripeCheckoutId: args.checkoutId,
      amount: args.amountCents,
      currency: args.currency,
    });
    return "stored";
  } catch (error: unknown) {
    if (isUniqueViolation(error)) return "duplicate";
    throw error;
  }
}

/** Grants any purchase waiting on this account's email. Safe to call on every request. */
export async function claimPendingPurchases(db: Db, args: { userId: string; email: string }): Promise<boolean> {
  const rows = await db
    .select()
    .from(pendingPurchase)
    .where(and(eq(pendingPurchase.email, args.email.trim().toLowerCase()), isNull(pendingPurchase.claimedAt)));
  let granted = false;
  for (const row of rows) {
    const result = await applyLifetimePurchase(db, {
      userId: args.userId,
      checkoutId: row.stripeCheckoutId,
      amountCents: row.amount,
      currency: row.currency,
      stripeCustomerId: null,
    });
    await db
      .update(pendingPurchase)
      .set({ claimedAt: new Date(), claimedBy: args.userId })
      .where(eq(pendingPurchase.id, row.id));
    if (result === "applied") granted = true;
  }
  return granted;
}

export async function isFounder(db: Db, userId: string): Promise<boolean> {
  const rows = await db.select({ id: purchase.id }).from(purchase).where(and(eq(purchase.userId, userId), eq(purchase.kind, "lifetime"))).limit(1);
  return rows.length > 0;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if (/unique|duplicate key|23505/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}
