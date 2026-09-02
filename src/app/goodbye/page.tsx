import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/daily/countdown";
import { nextDayBoundary } from "@/lib/game/day";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "See you tomorrow", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Where sign-out lands (BAM, 2026-09-02): an invitation back, not a dead end. */
export default function GoodbyePage() {
  const boundary = nextDayBoundary(new Date(), env.DAILY_TIMEZONE).getTime();
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-8">
      <header>
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
      </header>
      <section className="rounded-md border border-rule bg-card p-5">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Signed out</p>
        <h1 className="mt-2 font-display text-3xl leading-tight italic">See you tomorrow.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Your Guild, streaks, and takes are safe. A new creature and a brand-new voice
          arrive at midnight UTC
          <Countdown deadlineMs={boundary} />.
        </p>
      </section>
      <Link
        href="/"
        className="flex min-h-12 items-center justify-center rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Peek at today&apos;s recipe anyway
      </Link>
      <p className="text-center text-xs leading-relaxed text-muted">
        Tomorrow&apos;s specimen is the same for everyone on Earth. Come hear what yours sounds
        like.
      </p>
    </main>
  );
}
