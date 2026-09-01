import type { Metadata } from "next";
import Link from "next/link";
import { CreatureSvg } from "@/components/creature-svg";
import { getDb } from "@/db/client";
import { dayKey } from "@/lib/game/day";
import { GOAT_MILESTONES, nextGoat } from "@/lib/game/streak";
import { env } from "@/lib/env";
import { isFounder } from "@/lib/billing/core";
import { getMenagerie } from "@/lib/menagerie";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "The Menagerie" };
export const dynamic = "force-dynamic";

/** The collection (PRD §3): every creature performed, silhouettes for missed days, forever. */
export default async function MenageriePage() {
  const user = await requireUser();
  const db = await getDb();
  const today = dayKey(new Date(), env.DAILY_TIMEZONE);
  const view = await getMenagerie(db, { userId: user.id, today });
  const founder = await isFounder(db, user.id);
  const upcoming = nextGoat(view.streaks.current);
  const collectedGoats = GOAT_MILESTONES.filter((m) => view.streaks.best >= m).length;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">
          The Menagerie
          {founder ? (
            <span className="ml-2 align-middle rounded-sm border border-ochre px-2 py-0.5 font-sans text-[10px] font-semibold tracking-[0.1em] text-ochre uppercase not-italic">
              founder
            </span>
          ) : null}
        </span>
        <Link
          href="/"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Today
        </Link>
      </header>

      <div className="grid grid-cols-4 border-t border-b border-ink py-2">
        <div className="flex flex-col gap-0.5 px-1">
          <span className="font-display text-2xl">{view.observed}</span>
          <span className="text-[10px] tracking-[0.08em] text-muted uppercase">observed</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-dotted border-rule px-2">
          <span className="font-display text-2xl">{view.missed}</span>
          <span className="text-[10px] tracking-[0.08em] text-muted uppercase">missed</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-dotted border-rule px-2">
          <span className="font-display text-2xl">{view.streaks.current}</span>
          <span className="text-[10px] tracking-[0.08em] text-muted uppercase">current run</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-dotted border-rule px-2">
          <span className="font-display text-2xl">{view.streaks.best}</span>
          <span className="text-[10px] tracking-[0.08em] text-muted uppercase">best run</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        <span className="font-semibold text-moss">Rare specimens: {collectedGoats} of {GOAT_MILESTONES.length}.</span>{" "}
        {upcoming
          ? `The day-${upcoming} Goat is ${upcoming - view.streaks.current} day${upcoming - view.streaks.current === 1 ? "" : "s"} away.`
          : "Every Goat collected."}
      </p>

      {view.entries.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm leading-relaxed text-muted">
          Nothing observed yet. Submit today&apos;s take and the first plate appears here.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {view.entries.map((entry) => {
            const submitted = entry.takeNumber !== null;
            return (
              <li
                key={entry.dayKey}
                className={`flex flex-col items-center gap-1 p-1.5 ${
                  submitted
                    ? `bg-card border ${entry.isToday ? "border-ink" : "border-rule"}`
                    : "border border-dashed border-muted"
                }`}
              >
                <CreatureSvg
                  layers={entry.layers}
                  variant={submitted ? "plate" : "outline"}
                  size={72}
                  title={submitted ? entry.creatureName : `${entry.creatureName}, ${entry.isToday ? "not yet recorded" : "missed"}`}
                />
                <span className={`text-[10px] ${entry.isToday ? "font-semibold text-moss" : "text-muted"}`}>
                  {entry.dayKey.slice(5)}
                  {entry.isToday ? " · today" : submitted ? "" : " · missed"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-auto pb-4 text-xs leading-relaxed text-muted">
        A dashed frame is a day you missed. It stays a silhouette; the day is the point. Plates
        and runs are yours forever, even after free-plan audio expires at 30 days.
      </p>
    </main>
  );
}
