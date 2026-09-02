import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getDb } from "@/db/client";
import { applyLifetimePurchase, applySubscriptionActive, applySubscriptionLapsed, recordPendingPurchase } from "@/lib/billing/core";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import { getStripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Stripe webhook: plan state follows Stripe, idempotently (retries are routine). */
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "webhook secret missing", code: "unconfigured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature ?? "", env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ ok: false, error: "bad signature", code: "bad_signature" }, { status: 400 });
  }
  const db = await getDb();
  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const userId = s.client_reference_id ?? s.metadata?.userId;
      const payerEmail = s.customer_details?.email ?? s.customer_email ?? null;
      if (!userId && s.mode === "payment" && payerEmail) {
        // Bought while signed out: grant it now if the email already has an account, else park
        // it until one appears (claimed on that account's next request).
        const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, payerEmail));
        if (existing) {
          await applyLifetimePurchase(db, {
            userId: existing.id,
            checkoutId: s.id,
            amountCents: s.amount_total ?? 0,
            currency: s.currency ?? "usd",
            stripeCustomerId: typeof s.customer === "string" ? s.customer : null,
          });
        } else {
          await recordPendingPurchase(db, {
            email: payerEmail,
            checkoutId: s.id,
            amountCents: s.amount_total ?? 0,
            currency: s.currency ?? "usd",
          });
        }
      } else if (userId && s.mode === "payment") {
        await applyLifetimePurchase(db, {
          userId,
          checkoutId: s.id,
          amountCents: s.amount_total ?? 0,
          currency: s.currency ?? "usd",
          stripeCustomerId: typeof s.customer === "string" ? s.customer : null,
        });
      } else if (userId && s.mode === "subscription" && typeof s.customer === "string") {
        await applySubscriptionActive(db, { userId, stripeCustomerId: s.customer });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      if (typeof sub.customer === "string") {
        await applySubscriptionLapsed(db, { stripeCustomerId: sub.customer, now: new Date() });
      }
    }
  } catch (error: unknown) {
    console.error("[stripe] handler failed:", error instanceof Error ? error.constructor.name : "unknown");
    return NextResponse.json({ ok: false, error: "handler failed", code: "handler_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: { received: event.type } });
}
