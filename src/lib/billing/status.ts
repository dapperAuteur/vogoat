import { env } from "@/lib/env";

/**
 * Which Stripe world the app is talking to. A test key in production means checkout works but
 * never charges anyone, which is exactly the kind of thing that hides for a month; surface it.
 */
export type StripeMode = "live" | "test" | "unconfigured" | "unknown";

export function stripeModeFor(secretKey: string | undefined): StripeMode {
  if (!secretKey) return "unconfigured";
  if (secretKey.startsWith("sk_live_") || secretKey.startsWith("rk_live_")) return "live";
  if (secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_")) return "test";
  return "unknown";
}

export function stripeMode(): StripeMode {
  return stripeModeFor(env.STRIPE_SECRET_KEY);
}

/** Without this, every webhook is rejected and plans never change after payment. */
export function hasWebhookSecret(): boolean {
  return Boolean(env.STRIPE_WEBHOOK_SECRET);
}
