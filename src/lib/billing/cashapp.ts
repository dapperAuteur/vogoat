import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cashappClaim, user } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import { applyLifetimePurchase } from "./core";
import { PRICES } from "./prices";

// The manual $100 Cash App lifetime flow (mirrors FlashLearnAI): pay the QR, claim with your
// Cash App display name, BAM verifies against the Cash App activity feed.

export async function submitCashAppClaim(db: Db, args: { userId: string; cashAppName: string }): Promise<ActionResult<null>> {
  const name = args.cashAppName.trim();
  if (name.length < 2 || name.length > 60) return err("bad_input", "Enter the Cash App name you paid from.");
  const [account] = await db.select({ plan: user.plan }).from(user).where(eq(user.id, args.userId));
  if (!account) return err("not_found", "Sign in first.");
  if (account.plan === "lifetime") return err("already", "You already own VO GOAT for life.");
  const [pending] = await db
    .select({ id: cashappClaim.id })
    .from(cashappClaim)
    .where(and(eq(cashappClaim.userId, args.userId), eq(cashappClaim.status, "pending")));
  if (pending) return err("pending", "You already have a claim waiting for verification.");
  await db.insert(cashappClaim).values({ userId: args.userId, cashAppName: name });
  return ok(null);
}

export async function latestClaim(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(cashappClaim)
    .where(eq(cashappClaim.userId, userId))
    .orderBy(desc(cashappClaim.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listClaims(db: Db) {
  return db
    .select({ claim: cashappClaim, userName: user.name, userEmail: user.email })
    .from(cashappClaim)
    .innerJoin(user, eq(user.id, cashappClaim.userId))
    .orderBy(desc(cashappClaim.createdAt));
}

/** Verify grants lifetime through the same idempotent path as Stripe (founder counted). */
export async function resolveClaim(
  db: Db,
  args: { claimId: string; action: "verified" | "rejected"; notes?: string },
): Promise<ActionResult<null>> {
  const [claim] = await db.select().from(cashappClaim).where(eq(cashappClaim.id, args.claimId));
  if (!claim) return err("not_found", "No such claim.");
  if (claim.status !== "pending") return err("wrong_state", "Already resolved.");
  if (args.action === "verified") {
    const applied = await applyLifetimePurchase(db, {
      userId: claim.userId,
      checkoutId: `cashapp:${claim.id}`,
      amountCents: PRICES.lifetimeCashApp.cents,
      currency: "usd",
      stripeCustomerId: null,
    });
    if (applied === "no_user") return err("not_found", "The account no longer exists.");
  }
  await db
    .update(cashappClaim)
    .set({ status: args.action, adminNotes: args.notes?.slice(0, 500) || null, verifiedAt: new Date() })
    .where(eq(cashappClaim.id, args.claimId));
  return ok(null);
}
