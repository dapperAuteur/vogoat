"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { annualUnlocked, lifetimeSoldCount, PRICES } from "@/lib/billing/prices";
import { getStripe } from "@/lib/billing/stripe";
import { err, type ActionResult } from "@/lib/action-result";
import { env, hasStripe } from "@/lib/env";
import { isRateLimited } from "@/lib/rate-limit";
import { getSession, type SessionUser } from "@/lib/session";

type CheckoutKind = "lifetime" | "lifetime-cashapp" | "monthly" | "annual";

/** Creates the Stripe Checkout session and redirects; inline price_data, no dashboard products. */
export async function startCheckoutAction(formData: FormData): Promise<ActionResult<null> | never> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const user = session.user as SessionUser;
  const kind = formData.get("kind") as CheckoutKind | null;
  if (!kind || !["lifetime", "lifetime-cashapp", "monthly", "annual"].includes(kind)) return err("bad_input", "Unknown plan.");
  if (!hasStripe) return err("unconfigured", "Payments are not switched on yet.");
  if (user.plan === "lifetime") return err("already", "You already own VO GOAT for life.");
  if (isRateLimited(`checkout:${user.id}`, 5, 60_000)) return err("rate_limited", "Slow down a moment.");
  const db = await getDb();
  if (kind === "annual" && !annualUnlocked(await lifetimeSoldCount(db))) {
    return err("locked", "Annual opens after the first 100 lifetime founders.");
  }
  const stripe = getStripe();
  const base = {
    client_reference_id: user.id,
    customer_email: user.email,
    metadata: { userId: user.id, kind },
    success_url: `${env.APP_URL}/upgrade?status=success`,
    cancel_url: `${env.APP_URL}/upgrade?status=cancelled`,
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
          ...(kind === "lifetime-cashapp" ? { payment_method_types: ["cashapp" as const] } : {}),
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: kind === "lifetime-cashapp" ? PRICES.lifetimeCashApp.cents : PRICES.lifetime.cents,
                product_data: { name: "VO GOAT lifetime (founder)" },
              },
            },
          ],
        });
  if (!checkout.url) return err("stripe", "Could not start checkout; try again.");
  redirect(checkout.url);
}
