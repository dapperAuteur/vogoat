import type { Metadata } from "next";
import Link from "next/link";
import { startCheckoutAction } from "@/app/actions/billing";
import { getDb } from "@/db/client";
import { annualUnlocked, ANNUAL_UNLOCK_AT, PRICES } from "@/lib/billing/prices";
import { lifetimeSoldCount } from "@/lib/billing/core";
import { hasStripe } from "@/lib/env";
import { getSession, type SessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Upgrade" };
export const dynamic = "force-dynamic";

/** PRD §5: money buys practice, retention, and tools. Never extra entries into the daily. */
export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const session = await getSession();
  const user = session ? (session.user as SessionUser) : null;
  const db = await getDb();
  const sold = await lifetimeSoldCount(db);
  const annualOpen = annualUnlocked(sold);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
        <Link href="/" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Today
        </Link>
      </header>
      <h1 className="font-display text-3xl leading-tight italic">Practice like it matters.</h1>
      <p className="text-sm leading-relaxed text-muted">
        Every tier keeps the same one daily entry; that rule is the game. Paying buys the
        practice room (any of the 11,664 recipes on demand), unlimited daily takes, audio kept
        forever, and take downloads.
      </p>
      {status === "success" ? (
        <p role="status" className="rounded-md border border-moss px-3 py-2 text-sm font-semibold text-moss">
          Payment received. Your plan updates within a minute of Stripe confirming; refresh if
          needed.
        </p>
      ) : null}
      {status === "cancelled" ? (
        <p role="status" className="rounded-md border border-rule px-3 py-2 text-sm text-muted">
          Checkout cancelled; nothing was charged.
        </p>
      ) : null}
      {user?.plan === "lifetime" ? (
        <p className="rounded-md border border-moss bg-card p-4 text-sm font-semibold text-moss">
          You are a founder. VO GOAT is yours for life.
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
          downloads, and the founder badge in your Menagerie. {sold} of the first {ANNUAL_UNLOCK_AT}{" "}
          founder seats taken.
        </p>
        {user ? (
          <div className="mt-3 flex flex-col gap-2">
            <form action={startCheckoutAction}>
              <input type="hidden" name="kind" value="lifetime" />
              <button type="submit" disabled={!hasStripe || user.plan === "lifetime"} className="min-h-12 w-full rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50">
                Become a founder · {PRICES.lifetime.label}
              </button>
            </form>
            <form action={startCheckoutAction}>
              <input type="hidden" name="kind" value="lifetime-cashapp" />
              <button type="submit" disabled={!hasStripe || user.plan === "lifetime"} className="min-h-11 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50">
                Pay {PRICES.lifetimeCashApp.label} with Cash App Pay
              </button>
            </form>
          </div>
        ) : (
          <Link href="/sign-in" className="mt-3 flex min-h-12 items-center justify-center rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
            Sign in to upgrade
          </Link>
        )}
      </section>

      <section className="rounded-md border border-rule bg-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xl italic">Monthly</p>
          <p className="font-display text-xl">{PRICES.monthly.label}<span className="text-sm text-muted">/mo</span></p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Same practice room and unlimited takes; audio kept while active (30-day clock if you
          lapse; your Menagerie survives no matter what).
        </p>
        {user ? (
          <form action={startCheckoutAction} className="mt-3">
            <input type="hidden" name="kind" value="monthly" />
            <button type="submit" disabled={!hasStripe || user.plan !== "free"} className="min-h-11 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50">
              Subscribe monthly
            </button>
          </form>
        ) : null}
      </section>

      <section className={`rounded-md border p-4 ${annualOpen ? "border-rule bg-card" : "border-dashed border-muted"}`}>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-xl italic">Annual</p>
          <p className="font-display text-xl">{PRICES.annual.label}<span className="text-sm text-muted">/yr</span></p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {annualOpen
            ? "Twelve months for the price of a lifetime seat."
            : `Opens after the first ${ANNUAL_UNLOCK_AT} lifetime founders (${sold} so far).`}
        </p>
        {user && annualOpen ? (
          <form action={startCheckoutAction} className="mt-3">
            <input type="hidden" name="kind" value="annual" />
            <button type="submit" disabled={!hasStripe || user.plan !== "free"} className="min-h-11 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50">
              Subscribe annually
            </button>
          </form>
        ) : null}
      </section>

      <p className="pb-4 text-xs leading-relaxed text-muted">
        One submission per day for every tier, including these. Money never buys extra entries.
      </p>
    </main>
  );
}
