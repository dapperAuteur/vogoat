import type { Metadata } from "next";
import Link from "next/link";
import { startCheckoutAction } from "@/app/actions/billing";
import { getDb } from "@/db/client";
import { annualUnlocked, ANNUAL_UNLOCK_AT, PRICES } from "@/lib/billing/prices";
import { lifetimeSoldCount } from "@/lib/billing/core";
import { hasStripe } from "@/lib/env";
import { stripeMode } from "@/lib/billing/status";
import { getSession, type SessionUser } from "@/lib/session";
import { latestClaim } from "@/lib/billing/cashapp";
import { CashAppClaim } from "@/components/billing/cashapp-claim";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Lifetime founder seats, monthly, and annual plans: the practice room, unlimited daily takes, audio kept forever, take downloads. One submission a day for every tier.",
  alternates: { canonical: "/upgrade" },
};
export const dynamic = "force-dynamic";

/** PRD §5: money buys practice, retention, and tools. Never extra entries into the daily. */
export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const session = await getSession();
  const user = session ? (session.user as SessionUser) : null;
  const db = await getDb();
  const sold = await lifetimeSoldCount(db);
  const annualOpen = annualUnlocked(sold);
  const claim = user ? await latestClaim(db, user.id) : null;
  const claimStatus = (claim?.status ?? "none") as "none" | "pending" | "verified" | "rejected";
  const testMode = stripeMode() === "test";

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <h1 className="font-display text-3xl leading-tight italic">Practice like it matters.</h1>
      <p className="text-sm leading-relaxed text-muted">
        Every tier keeps the same one daily entry; that rule is the game. Paying buys the
        practice room (any of the 11,664 recipes on demand), unlimited daily takes, audio kept
        forever, and take downloads.
      </p>
      {status === "success" ? (
        <p role="status" className="rounded-md border border-moss px-3 py-2 text-sm font-semibold text-moss">
          Payment received. If you are signed in, your plan updates within a minute of Stripe
          confirming. If you bought while signed out, sign in with the email you paid with and
          your founder access is applied automatically.
        </p>
      ) : null}
      {status === "cancelled" ? (
        <p role="status" className="rounded-md border border-rule px-3 py-2 text-sm text-muted">
          Checkout cancelled; nothing was charged.
        </p>
      ) : null}
      {status && ["error", "unconfigured", "already", "rate_limited", "locked"].includes(status) ? (
        <p role="alert" className="rounded-md border border-ochre px-3 py-2 text-sm text-ochre">
          {status === "unconfigured"
            ? "Payments are not switched on yet."
            : status === "already"
              ? "You already own VO GOAT for life."
              : status === "rate_limited"
                ? "Slow down a moment and try again."
                : status === "locked"
                  ? "Annual opens after the first 100 lifetime founders."
                  : "Checkout could not start; nothing was charged. Try again."}
        </p>
      ) : null}
      {user?.plan === "lifetime" ? (
        <p className="rounded-md border border-moss bg-card p-4 text-sm font-semibold text-moss">
          You are a founder. VO GOAT is yours for life.
        </p>
      ) : null}
      {testMode ? (
        <p role="status" className="rounded-md border border-ochre px-3 py-2 text-sm text-ochre">
          Payments are in test mode right now: card checkout will not charge you. The Cash App
          option below is real either way.
        </p>
      ) : null}
      {!hasStripe ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">
          Payments are not switched on yet; prices below are what launches.
        </p>
      ) : null}

      <section className="rounded-md border border-ink bg-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xl italic">Lifetime</p>
          <p className="font-display text-xl">{PRICES.lifetime.label}</p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Once, forever: practice room, unlimited daily takes, audio kept for good, take
          downloads, and the founder badge in your Guild. {sold} of the first {ANNUAL_UNLOCK_AT}{" "}
          founder seats taken.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <form action={startCheckoutAction}>
            <input type="hidden" name="kind" value="lifetime" />
            <button type="submit" disabled={!hasStripe || user?.plan === "lifetime"} className="min-h-12 w-full rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50">
              {user?.plan === "lifetime" ? "You are a founder" : `Become a founder · ${PRICES.lifetime.label}`}
            </button>
          </form>
          {!user ? (
            <p className="text-xs leading-relaxed text-muted">
              No account needed to buy. Pay first, then sign in with the same email and your
              founder access is waiting.
            </p>
          ) : null}
          {user && user.plan !== "lifetime" ? <CashAppClaim status={claimStatus} price={PRICES.lifetimeCashApp.label} /> : null}
          {!user ? (
            <p className="text-xs leading-relaxed text-muted">
              Paying with Cash App instead?{" "}
              <Link href="/sign-in" className="font-semibold text-moss underline-offset-4 hover:underline">
                Sign in first
              </Link>{" "}
              so the payment can be matched to your account.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-md border border-rule bg-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xl italic">Monthly</p>
          <p className="font-display text-xl">{PRICES.monthly.label}<span className="text-sm text-muted">/mo</span></p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Same practice room and unlimited takes; audio kept while active (30-day clock if you
          lapse; your Guild survives no matter what).
        </p>
        <form action={startCheckoutAction} className="mt-3">
          <input type="hidden" name="kind" value="monthly" />
          <button
            type="submit"
            disabled={!hasStripe || user?.plan === "lifetime" || user?.plan === "subscriber"}
            className="min-h-12 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
          >
            {user?.plan === "lifetime" ? "Lifetime already covers this" : user?.plan === "subscriber" ? "You are subscribed" : "Subscribe monthly"}
          </button>
        </form>
      </section>

      {annualOpen ? (
        <section className="rounded-md border border-rule bg-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-display text-xl italic">Annual</p>
            <p className="font-display text-xl">
              {PRICES.annual.label}
              <span className="text-sm text-muted">/yr</span>
            </p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">Twelve months for the price of a lifetime seat.</p>
          <form action={startCheckoutAction} className="mt-3">
            <input type="hidden" name="kind" value="annual" />
            <button
              type="submit"
              disabled={!hasStripe || user?.plan === "lifetime" || user?.plan === "subscriber"}
              className="min-h-12 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
            >
              Subscribe annually
            </button>
          </form>
        </section>
      ) : null}

      <p className="pb-4 text-xs leading-relaxed text-muted">
        One submission per day for every tier, including these. Money never buys extra entries.
        Have a promo code? There is a field for it at checkout.
      </p>
    </main>
  );
}
