import Link from "next/link";
import { getDb } from "@/db/client";
import { lifetimeSoldCount } from "@/lib/billing/core";
import { ANNUAL_UNLOCK_AT, PRICES } from "@/lib/billing/prices";
import { witusEndSessionEndpoint } from "@/lib/env";
import { getSession, type SessionUser } from "@/lib/session";
import { hasPaidPerks } from "@/lib/takes/download-policy";
import { SignOutButton } from "./auth/sign-out-button";

/**
 * The one header, sticky on every page (BAM, 2026-09-02: the menu and the upgrade call must
 * stay put while scrolling, and Upgrade was too hard to find). Server component so it can show
 * the live founder count without a client fetch.
 */
export async function SiteHeader() {
  const session = await getSession();
  const user = session ? (session.user as SessionUser) : null;
  const isPaid = user?.plan === "lifetime" || user?.plan === "subscriber";
  let sold = 0;
  if (!isPaid) {
    try {
      sold = await lifetimeSoldCount(await getDb());
    } catch {
      sold = 0; // a database hiccup must not take the header down
    }
  }
  const seatsLeft = Math.max(ANNUAL_UNLOCK_AT - sold, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/95 backdrop-blur">
      {!isPaid ? (
        <Link
          href="/upgrade"
          className="flex min-h-11 w-full items-center justify-center gap-2 bg-moss px-4 text-center text-xs font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current sm:text-sm"
        >
          <span>
            Founder seats {PRICES.lifetime.label} for life
            {seatsLeft > 0 ? ` · ${seatsLeft} of ${ANNUAL_UNLOCK_AT} left` : ""}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
      {/* The voice promise, pinned under the price promo on every page (BAM, 2026-09-10). */}
      <Link
        href="/voice-data"
        className="flex min-h-11 w-full items-center justify-center gap-2 bg-ink px-4 text-center text-xs font-bold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current sm:text-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
          <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span>No AI listens to or trains on your voice · Recordings deleted after 30 days</span>
      </Link>
      <nav aria-label="Main" className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-5 py-2">
        <Link href="/" className="font-display text-xl tracking-wide italic focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          VO GOAT
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
          <Link href="/how-to" className="flex min-h-11 items-center px-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
            How to
          </Link>
          <Link href="/archive" className="flex min-h-11 items-center px-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
            Archive
          </Link>
          {user ? (
            <>
              <Link href="/guild" className="flex min-h-11 items-center px-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                Guild
              </Link>
              {hasPaidPerks(user) ? (
                <Link href="/practice" className="flex min-h-11 items-center px-2 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                  Practice
                </Link>
              ) : null}
              {user.role === "admin" ? (
                <Link href="/admin" className="flex min-h-11 items-center px-2 text-ochre hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                  Admin
                </Link>
              ) : null}
              {/* Global sign-out: the IdP endpoint keeps "sign out of every WitUS app" working. */}
              <SignOutButton endSessionUrl={witusEndSessionEndpoint} />
            </>
          ) : (
            <Link href="/sign-in" className="flex min-h-11 items-center rounded-md border border-ink px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
