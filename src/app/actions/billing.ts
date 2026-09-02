"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { lifetimeSoldCount } from "@/lib/billing/core";
import { annualUnlocked, PRICES } from "@/lib/billing/prices";
import { getStripe } from "@/lib/billing/stripe";
import { env, hasStripe } from "@/lib/env";
import { isRateLimited } from "@/lib/rate-limit";
import { getSession, type SessionUser } from "@/lib/session";

type CheckoutKind = "lifetime" | "monthly" | "annual";

/**
 * Form action (must resolve void): failures land back on /upgrade with a status code the
 * page explains; success redirects to Stripe Checkout. Inline price_data, no dashboard
 * products (prices are BAM's 2026-09-01 numbers in @/lib/billing/prices).
 */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const user = session ? (session.user as SessionUser) : null;
  const kind = formData.get("kind") as CheckoutKind | null;
  // Buying does not require an account (BAM, 2026-09-02): a lifetime seat bought while signed
  // out is claimed by whoever signs in with the paying email. Subscriptions still need the
  // account first, because the plan follows a Stripe customer over time.
  if (!user && kind !== "lifetime") redirect("/sign-in");
  if (!kind || !["lifetime", "monthly", "annual"].includes(kind)) redirect("/upgrade?status=error");
  if (!hasStripe) redirect("/upgrade?status=unconfigured");
  if (user?.plan === "lifetime") redirect("/upgrade?status=already");
  if (user && isRateLimited(`checkout:${user.id}`, 5, 60_000)) redirect("/upgrade?status=rate_limited");
  const db = await getDb();
  if (kind === "annual" && !annualUnlocked(await lifetimeSoldCount(db))) redirect("/upgrade?status=locked");

  let url: string | null = null;
  try {
    const stripe = getStripe();
    const base = {
      ...(user ? { client_reference_id: user.id, customer_email: user.email } : {}),
      // `app` is the ecosystem guard: the Stripe account is shared, so every app stamps its
      // slug and ignores sessions that are not its own (see plans/future/07).
      metadata: { app: "vogoat", ...(user ? { userId: user.id } : {}), kind },
      success_url: `${env.APP_URL}/upgrade?status=success`,
      cancel_url: `${env.APP_URL}/upgrade?status=cancelled`,
      // Promos (future/03 step 1): BAM creates codes in the Stripe dashboard; checkout shows the field.
      allow_promotion_codes: true,
    } as const;
    const checkout =
      kind === "monthly" || kind === "annual"
        ? await stripe.checkout.sessions.create({
            ...base,
            mode: "subscription",
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: kind === "monthly" ? PRICES.monthly.cents : PRICES.annual.cents,
                  recurring: { interval: kind === "monthly" ? "month" : "year" },
                  product_data: { name: kind === "monthly" ? "VO GOAT monthly" : "VO GOAT annual" },
                },
              },
            ],
          })
        : await stripe.checkout.sessions.create({
            ...base,
            mode: "payment",
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: PRICES.lifetime.cents,
                  product_data: { name: "VO GOAT lifetime (founder)" },
                },
              },
            ],
          });
    url = checkout.url;
  } catch (error: unknown) {
    console.error("[billing] checkout failed:", error instanceof Error ? error.constructor.name : "unknown");
    redirect("/upgrade?status=error");
  }
  redirect(url ?? "/upgrade?status=error");
}
