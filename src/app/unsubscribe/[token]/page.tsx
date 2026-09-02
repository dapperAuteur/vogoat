import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { unsubscribeByToken } from "@/lib/campaigns/core";

export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

/**
 * One click from any campaign email. The link carries the account's own token, so nothing has
 * to be typed and no sign-in is needed. An unknown or expired token is not a failure: the
 * person wanted off the list, and either way they are.
 */
export default async function UnsubscribePage({ params }: Params) {
  const { token } = await params;
  const db = await getDb();
  const result = await unsubscribeByToken(db, decodeURIComponent(token));

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
      </header>
      <section className="rounded-md border border-ink bg-card p-4">
        <h1 className="font-display text-2xl">
          {result === "unsubscribed" ? "You are off the list" : "Nothing to change"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {result === "unsubscribed"
            ? "Done. VO GOAT will not email you announcements again unless you ask it to."
            : "This link is old or already used, so there is nothing left to switch off."}
        </p>
      </section>
      <p className="text-xs leading-relaxed text-muted">
        Your Guild, your runs, and your plates are untouched. You can turn announcements back on
        any time from the bottom of your Guild page.
      </p>
      <Link
        href="/"
        className="flex min-h-11 items-center justify-center rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Back to today
      </Link>
    </main>
  );
}
