import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte, isNull, inArray } from "drizzle-orm";
import { CreatureSvg } from "@/components/creature-svg";
import { getDb } from "@/db/client";
import { creature, daily, script } from "@/db/schema";
import { RUNWAY_ALERT_BELOW, RUNWAY_TARGET, getRunway } from "@/lib/authoring/core";
import { dayKey } from "@/lib/game/day";
import { headlineTraits } from "@/lib/game/recipe";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import {
  approveDailyAction,
  extendQueueAction,
  rerollCreatureAction,
  rerollRecipeAction,
  revertDailyAction,
  swapScriptAction,
} from "./actions";

export const metadata: Metadata = { title: "Daily authoring", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  draft: "border-rule text-muted",
  approved: "border-moss text-moss",
  published: "border-moss text-moss",
  auto: "border-ochre text-ochre",
};

/** PRD §6.4-5: the upcoming batch; BAM swaps, rerolls, vetoes, approves. Runway target 14. */
export default async function DailyAuthoringPage() {
  await requireAdmin();
  const db = await getDb();
  const today = dayKey(new Date(), env.DAILY_TIMEZONE);
  const runway = await getRunway(db, today);
  const rows = await db
    .select({ d: daily, creatureName: creature.name, layers: creature.layers, scriptBody: script.body })
    .from(daily)
    .innerJoin(creature, eq(creature.id, daily.creatureId))
    .innerJoin(script, eq(script.id, daily.scriptId))
    .where(gte(daily.dayDate, today))
    .orderBy(asc(daily.dayDate));
  const spareScripts = await db
    .select({ id: script.id, body: script.body })
    .from(script)
    .where(and(inArray(script.status, ["use", "backlog"]), isNull(script.usedOn)))
    .orderBy(asc(script.createdAt));
  const low = runway.consecutive < RUNWAY_ALERT_BELOW;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Daily authoring</span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Admin
        </Link>
      </header>

      <section className={`rounded-md border p-4 ${low ? "border-ochre" : "border-rule"} bg-card`}>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Runway</p>
        <p className={`mt-1 font-display text-2xl ${low ? "text-ochre" : ""}`}>
          {runway.consecutive} approved day{runway.consecutive === 1 ? "" : "s"} from today
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Target {RUNWAY_TARGET}; the alert email fires below {RUNWAY_ALERT_BELOW}. Drafts waiting:{" "}
          {runway.drafts}. Auto days needing retroactive review: {runway.autosToReview}. Spare
          approved scripts: {spareScripts.length}.
        </p>
        <form action={extendQueueAction} className="mt-3">
          <button
            type="submit"
            className="min-h-12 w-full rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Extend the queue (next {RUNWAY_TARGET} days)
          </button>
        </form>
        <p className="mt-1 text-xs text-muted">
          Fills empty dates with drafts from your approved script pool; nothing publishes until
          you approve each pairing.
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">
          Nothing queued yet. Extend the queue to draft the next two weeks.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ d, creatureName, layers, scriptBody }) => (
            <li key={d.id} className="rounded-md border border-rule bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
                    {d.dayDate}
                    {d.dayDate === today ? " · today" : ""}
                  </p>
                  <p className="font-display text-lg leading-snug italic">{creatureName}</p>
                  <p className="text-xs text-muted">{headlineTraits(d.recipe).join(" · ")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${STATUS_STYLE[d.status]}`}>
                    {d.status}
                  </span>
                  <CreatureSvg layers={layers} variant="plate" size={56} title={creatureName} />
                </div>
              </div>
              <p className="mt-2 border-t border-dotted border-rule pt-2 font-display text-base leading-snug">
                &ldquo;{scriptBody}&rdquo;
              </p>
              {d.status === "draft" || d.status === "auto" ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <form action={approveDailyAction} className="flex-1">
                      <input type="hidden" name="dailyId" value={d.id} />
                      <button type="submit" className="min-h-11 w-full rounded-md border border-moss bg-moss text-sm font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                        approve
                      </button>
                    </form>
                    {d.status === "draft" ? (
                      <>
                        <form action={rerollCreatureAction} className="flex-1">
                          <input type="hidden" name="dailyId" value={d.id} />
                          <button type="submit" className="min-h-11 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                            reroll creature
                          </button>
                        </form>
                        <form action={rerollRecipeAction} className="flex-1">
                          <input type="hidden" name="dailyId" value={d.id} />
                          <button type="submit" className="min-h-11 w-full rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                            reroll recipe
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                  {d.status === "draft" && spareScripts.length > 0 ? (
                    <form action={swapScriptAction} className="flex gap-2">
                      <input type="hidden" name="dailyId" value={d.id} />
                      <label htmlFor={`swap-${d.id}`} className="sr-only">
                        Swap script for {d.dayDate}
                      </label>
                      <select id={`swap-${d.id}`} name="scriptId" className="min-h-11 min-w-0 flex-1 rounded-md border border-rule bg-paper px-2 text-xs" defaultValue="">
                        <option value="" disabled>
                          Swap script…
                        </option>
                        {spareScripts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.body.slice(0, 60)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="min-h-11 rounded-md border border-ink px-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                        swap
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : d.status === "approved" ? (
                <form action={revertDailyAction} className="mt-3">
                  <input type="hidden" name="dailyId" value={d.id} />
                  <button type="submit" className="min-h-11 w-full rounded-md border border-rule text-sm font-semibold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                    revert to draft
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
