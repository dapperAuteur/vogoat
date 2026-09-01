import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreatureSvg } from "@/components/creature-svg";
import { Countdown } from "@/components/daily/countdown";
import { WheelTable } from "@/components/daily/wheel-table";
import { getTodaysDaily, NoScriptAvailableError, type DailyView } from "@/lib/daily";
import { nextDayBoundary } from "@/lib/game/day";
import { env } from "@/lib/env";
import { getSession, type SessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  let daily: DailyView | null = null;
  try {
    daily = await getTodaysDaily();
  } catch (error: unknown) {
    if (!(error instanceof NoScriptAvailableError)) throw error;
  }
  const boundary = nextDayBoundary(new Date(), env.DAILY_TIMEZONE).getTime();

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl italic">VoGoat</span>
          {daily ? <span className="text-sm font-semibold text-muted">No. {daily.dayNumber}</span> : null}
        </div>
        {session ? (
          <div className="flex items-center gap-1">
            {(session.user as SessionUser).role === "admin" ? (
              <Link
                href="/admin/scripts"
                className="flex min-h-11 items-center px-2 text-sm font-semibold text-ochre underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Scripts
              </Link>
            ) : null}
            <span className="text-sm font-semibold text-muted">{session.user.name}</span>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Sign in
          </Link>
        )}
      </header>

      {daily ? (
        <>
          <section className="rounded-md border border-rule bg-card p-4" aria-label="Today's specimen">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                Specimen No. {daily.dayNumber}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">{daily.dayKey}</span>
            </div>
            <h1 className="reveal-row mt-1 font-display text-3xl leading-tight italic" style={{ animationDelay: "0.05s" }}>
              {daily.creature.name}
            </h1>
            <div className="mt-3">
              <WheelTable recipe={daily.recipe} />
            </div>
          </section>

          <section className="flex items-stretch gap-4">
            <div className="flex w-32 shrink-0 flex-col items-center gap-1 rounded-md border border-rule bg-card p-2">
              <CreatureSvg layers={daily.creature.layers} variant="outline" size={104} title={`${daily.creature.name}, unrecorded`} />
              <span className="text-[10px] tracking-[0.12em] text-muted uppercase">Plate {daily.dayNumber} · unrecorded</span>
            </div>
            <p className="self-center text-sm leading-relaxed text-muted">
              The plate fills in when you submit a take. Spinning and rehearsing never need an
              account.
            </p>
          </section>

          <section className="px-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Read aloud</p>
            <p className="reveal-row mt-1 font-display text-2xl leading-snug" style={{ animationDelay: "1.2s" }}>
              {daily.script.body}
            </p>
          </section>
        </>
      ) : (
        <section className="rounded-md border border-rule bg-card p-5">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Field note</p>
          <h1 className="mt-2 font-display text-3xl leading-tight italic">Today&apos;s specimen is resting.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The next recipe appears at midnight UTC. One shared voice recipe a day: record your
            take, keep your best, collect the creature in your Menagerie.
          </p>
        </section>
      )}

      <div className="sticky bottom-0 mt-auto flex flex-col gap-2 bg-paper pt-2 pb-5">
        <button
          type="button"
          disabled
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-moss font-semibold text-on-moss opacity-60"
          title="Recording is being built"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
          Record a take (coming soon)
        </button>
        <p className="text-center text-xs leading-relaxed text-muted">
          Audio stays on your device until you keep a take. Free plan: 3 takes a day.
        </p>
        <p className="text-center text-xs text-muted">
          Next specimen at midnight UTC<Countdown deadlineMs={boundary} />
        </p>
      </div>
    </main>
  );
}
