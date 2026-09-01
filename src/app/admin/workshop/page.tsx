import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { getTodaysDaily, NoScriptAvailableError, type DailyView } from "@/lib/daily";
import { dayKey } from "@/lib/game/day";
import { headlineTraits } from "@/lib/game/recipe";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { cycleProgress, getWorkshopAssignment, getWorkshopEntry, listWorkshopEntries, workshopStreaks } from "@/lib/workshop/core";
import { saveWorkshopEntryAction } from "./actions";

export const metadata: Metadata = { title: "The Workshop", robots: { index: false } };
export const dynamic = "force-dynamic";

/** PRD §9: one device a day, BAM writes, the entry saves. Private; role-gated, never hardcoded. */
export default async function WorkshopPage() {
  const user = await requireAdmin();
  const db = await getDb();
  const today = dayKey(new Date(), env.DAILY_TIMEZONE);
  const assignment = await getWorkshopAssignment(db, today);
  let daily: DailyView | null = null;
  try {
    daily = await getTodaysDaily();
  } catch (error: unknown) {
    if (!(error instanceof NoScriptAvailableError)) throw error;
  }
  const [entry, entries, streaks, progress] = await Promise.all([
    getWorkshopEntry(db, user.id, today),
    listWorkshopEntries(db, user.id),
    workshopStreaks(db, user.id, today),
    assignment ? cycleProgress(db, assignment.cycle) : Promise.resolve(null),
  ]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">The Workshop</span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Admin
        </Link>
      </header>

      {!assignment ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">
          No literary devices are seeded yet; run the seed first.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted">
            Writing run: {streaks.current} day{streaks.current === 1 ? "" : "s"} (best {streaks.best}) · cycle{" "}
            {assignment.cycle}, device {progress?.used ?? "?"} of {progress?.total ?? "?"} · no repeats until the
            cycle completes.
          </p>

          <section className="rounded-md border border-rule bg-card p-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Today&apos;s device · {today}</p>
            <h1 className="mt-1 font-display text-3xl leading-tight italic">{assignment.device.name}</h1>
            <p className="mt-2 text-sm leading-relaxed">{assignment.device.definition}</p>
            <ul className="mt-2 flex flex-col gap-1 border-t border-dotted border-rule pt-2">
              {assignment.device.examples.map((example, i) => (
                <li key={i} className="text-xs leading-relaxed text-muted">
                  {example}
                </li>
              ))}
            </ul>
          </section>

          {daily ? (
            <section className="rounded-md border border-rule bg-card p-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                Optional constraints · today&apos;s recipe
              </p>
              <p className="mt-1 font-display text-lg leading-snug italic">{daily.creature.name}</p>
              <p className="text-xs text-muted">{headlineTraits(daily.recipe).join(" · ")}</p>
              <p className="mt-2 text-sm leading-snug">&ldquo;{daily.script.body}&rdquo;</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Write for the collision if it inspires; ignore it if not (PRD §9).
              </p>
            </section>
          ) : null}

          <form action={saveWorkshopEntryAction} className="flex flex-col gap-2">
            <input type="hidden" name="deviceId" value={assignment.device.id} />
            <label htmlFor="workshop-body" className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              Today&apos;s writing
            </label>
            <textarea
              id="workshop-body"
              name="body"
              rows={8}
              required
              maxLength={20000}
              defaultValue={entry?.body ?? ""}
              placeholder={`Something using ${assignment.device.name.toLowerCase()}…`}
              className="rounded-md border border-rule bg-card p-3 font-display text-lg leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="scriptCandidate"
                defaultChecked={entry?.isScriptCandidate ?? false}
                className="h-5 w-5 accent-[#3f6212]"
              />
              Send to script triage as a candidate (the loop-closer)
            </label>
            <button
              type="submit"
              className="min-h-12 rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              {entry ? "Save changes" : "Save today's entry"}
            </button>
            <p className="text-xs text-muted">Private. Saved forever. Nothing publishes anywhere.</p>
          </form>

          {entries.length > 0 ? (
            <section className="flex flex-col gap-2" aria-label="Archive">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Archive</p>
              {entries.map(({ e, deviceName }) => (
                <details key={e.id} className="rounded-md border border-rule bg-card p-3">
                  <summary className="min-h-11 cursor-pointer text-sm">
                    <span className="font-semibold">{e.dayDate}</span>{" "}
                    <span className="text-muted">
                      · {deviceName}
                      {e.isScriptCandidate ? " · script candidate" : ""}
                    </span>
                  </summary>
                  <p className="mt-2 font-display text-base leading-relaxed whitespace-pre-line">{e.body}</p>
                </details>
              ))}
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
