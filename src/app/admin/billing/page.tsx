import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { cashappClaim, purchase, user } from "@/db/schema";
import { lifetimeSoldCount } from "@/lib/billing/core";
import { ANNUAL_UNLOCK_AT } from "@/lib/billing/prices";
import { hasWebhookSecret, stripeMode } from "@/lib/billing/status";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Billing health", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Is the money plumbing actually connected? Every answer here is read from the live config. */
export default async function BillingHealthPage() {
  await requireAdmin();
  const db = await getDb();
  const mode = stripeMode();
  const webhook = hasWebhookSecret();
  const [sold, purchases, claims] = await Promise.all([
    lifetimeSoldCount(db),
    db
      .select({ p: purchase, email: user.email })
      .from(purchase)
      .innerJoin(user, eq(user.id, purchase.userId))
      .orderBy(desc(purchase.createdAt))
      .limit(10),
    db.select({ id: cashappClaim.id, status: cashappClaim.status }).from(cashappClaim),
  ]);
  const pendingClaims = claims.filter((c) => c.status === "pending").length;

  const checks: Array<{ label: string; ok: boolean; detail: string }> = [
    {
      label: "Stripe secret key",
      ok: mode === "live" || mode === "test",
      detail:
        mode === "live"
          ? "Live mode: real cards, real money."
          : mode === "test"
            ? "TEST mode: checkout works but nobody is ever charged. Swap in the live key before launch."
            : "Not set; the upgrade page shows prices with buying disabled.",
    },
    {
      label: "Webhook signing secret",
      ok: webhook,
      detail: webhook
        ? `Set. It must be the signing secret of the endpoint pointing at ${env.APP_URL}/api/stripe/webhook, in the same mode as the key.`
        : "Missing: every webhook is rejected, so a paid customer never becomes a paid account.",
    },
  ];

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Billing health</span>
        <Link href="/admin" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Admin
        </Link>
      </header>

      <ul className="flex flex-col gap-2">
        {checks.map((check) => (
          <li key={check.label} className={`rounded-md border p-3 ${check.ok ? "border-rule bg-card" : "border-ochre bg-card"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{check.label}</p>
              <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${check.ok ? "border-moss text-moss" : "border-ochre text-ochre"}`}>
                {check.label.startsWith("Stripe") ? mode : check.ok ? "set" : "missing"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{check.detail}</p>
          </li>
        ))}
      </ul>

      <section className="rounded-md border border-rule bg-card p-4">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Founders</p>
        <p className="mt-1 font-display text-2xl">
          {sold} of {ANNUAL_UNLOCK_AT}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Annual opens at {ANNUAL_UNLOCK_AT}. Cash App claims waiting on you: {pendingClaims}.{" "}
          <Link href="/admin/cashapp" className="font-semibold text-moss underline-offset-4 hover:underline">
            Review claims
          </Link>
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Recent purchases</p>
        {purchases.length === 0 ? (
          <p className="rounded-md border border-rule bg-card p-3 text-sm text-muted">
            None yet. A successful checkout writes a row here within seconds of Stripe calling the
            webhook; if a payment succeeds and nothing appears, the webhook is the suspect.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {purchases.map(({ p, email }) => (
              <li key={p.id} className="rounded-md border border-rule bg-card p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{email}</span>
                  <span className="text-muted">${(p.amount / 100).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted">
                  {p.kind} · {p.stripeCheckoutId.startsWith("cashapp:") ? "Cash App (hand verified)" : "Stripe"} ·{" "}
                  {p.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="pb-4 text-xs leading-relaxed text-muted">
        Webhook endpoint to register in Stripe: <span className="font-mono">{env.APP_URL}/api/stripe/webhook</span>{" "}
        with events <span className="font-mono">checkout.session.completed</span> and{" "}
        <span className="font-mono">customer.subscription.deleted</span>.
      </p>
    </main>
  );
}
