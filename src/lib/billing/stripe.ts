import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured (task 09)");
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
