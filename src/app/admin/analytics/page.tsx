import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { funnelRates, getAnalyticsReport, type FunnelCounts } from "@/lib/analytics/queries";
import { dayKey } from "@/lib/game/day";
import { env, hasPostHog } from "@/lib/env";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };
export const dynamic = "force-dynamic";

const POSTHOG_URL = "https://us.posthog.com";
/** PRD §15 kill criteria, 90 days after launch. Provisional until BAM sets the real ones. */
const KILL_SUBMIT_RATE = 0.2;
const KILL_D7_RATE = 0.1;

const num = new Intl.NumberFormat("en-US");
function pct(value: number | null, digits = 0): string {
  return value === null ? "no data" : `${(value * 100).toFixed(digits)}%`;
}
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** One funnel row across the three windows. */
function Row({ label, hint, values }: { label: string; hint?: string; values: readonly number[] }) {
  return (
    <div className="grid grid-cols-[1fr_3rem_3rem_3rem] items-baseline gap-1 border-t border-dotted border-rule py-1.5 first:border-t-0">
      <span className="text-xs leading-snug">
        {label}
        {hint ? <span className="block text-[10px] text-muted">{hint}</span> : null}
      </span>
      {values.map((v, i) => (
        <span key={i} className={`text-right font-display text-lg ${i === 0 ? "" : "text-muted"}`}>
          {num.format(v)}
        </span>
      ))}
    </div>
  );
}

/** A labelled bar. `share` is 0..1 of the widest bar in its group. */
function Bar({ label, count, share, muted }: { label: string; count: number; share: number; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_2rem] items-center gap-2">
      <span className={`text-[10px] tabular-nums ${muted ? "text-muted" : ""}`}>{label}</span>
      <span className="flex h-2.5 w-full items-center rounded-sm bg-paper">
        <span
          className={`h-2.5 rounded-sm ${count === 0 ? "" : muted ? "bg-rule" : "bg-moss"}`}
          style={{ width: `${Math.max(share * 100, count === 0 ? 0 : 3)}%` }}
        />
      </span>
      <span className="text-right text-[10px] tabular-nums text-muted">{num.format(count)}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-rule bg-card p-4">
      <h2 className="font-display text-xl italic">{title}</h2>
      {children}
    </section>
  );
}

/** What players use versus what they avoid, from our own tables (plans/future/04, PRD §15). */
export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const db = await getDb();
  const today = dayKey(new Date(), env.DAILY_TIMEZONE);
  const report = await getAnalyticsReport(db, today);
  const { funnel, habit, usage, population } = report;
  const rates = funnelRates(funnel.all);
  const rates7 = funnelRates(funnel.last7);
  const cols = (pick: (c: FunnelCounts) => number) => [pick(funnel.all), pick(funnel.last7), pick(funnel.last30)];

  const seriesPeak = Math.max(1, ...habit.series.map((d) => d.submitters));
  const takePeak = Math.max(1, ...usage.takeNumbers.map((s) => s.submissions));
  const planPeak = Math.max(1, ...population.plans.map((p) => p.players));
  const sharesPerSubmission = funnel.all.submittedTakes > 0 ? usage.sharesCreated / funnel.all.submittedTakes : null;
  const reportsPer100Shares = usage.sharesCreated > 0 ? (usage.reportsFiled / usage.sharesCreated) * 100 : null;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Analytics</span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Admin
        </Link>
      </header>

      <p className="text-sm leading-relaxed text-muted">
        Counted in our own database, no personal data involved. Windows are VoGoat days in{" "}
        {env.DAILY_TIMEZONE}: last 7 is {report.windowStart7} to {today}, last 30 starts{" "}
        {report.windowStart30}. Admin accounts are excluded from every player number, because you
        record every day and would swamp a small population.
      </p>

      <Card title="The funnel">
        <div className="grid grid-cols-[1fr_3rem_3rem_3rem] gap-1 border-b border-ink pb-1 text-[10px] tracking-[0.08em] text-muted uppercase">
          <span>step</span>
          <span className="text-right">all</span>
          <span className="text-right">7d</span>
          <span className="text-right">30d</span>
        </div>
        <Row label="Dailies served" hint="days that actually went live" values={cols((c) => c.dailiesServed)} />
        <Row label="Takes started" hint="recordings registered, kept or not" values={cols((c) => c.takesRegistered)} />
        <Row label="Players who started" hint="distinct accounts" values={cols((c) => c.playersWhoStarted)} />
        <Row label="Takes kept" hint="uploaded instead of discarded" values={cols((c) => c.keptTakes)} />
        <Row label="Takes submitted" hint="one per player per day" values={cols((c) => c.submittedTakes)} />
        <Row label="Players who submitted" values={cols((c) => c.playersWhoSubmitted)} />
        <div className="mt-1 flex flex-col gap-1.5 border-t border-ink pt-2 text-xs leading-relaxed">
          <p>
            <span className="font-semibold">Start to submit: {pct(rates.startToSubmit, 1)} all time</span>, {pct(rates7.startToSubmit, 1)} in
            the last 7 days. The PRD §15 kill line is about {pct(KILL_SUBMIT_RATE)} ninety days after
            launch.
            {rates.startToSubmit !== null && rates.startToSubmit < KILL_SUBMIT_RATE
              ? " Currently under it: the payoff is the fix, not more wheels."
              : ""}
          </p>
          <p className="text-muted">
            {pct(rates.playerDropOff, 1)} of players who started a take never submitted one.{" "}
            {pct(rates.keepRate, 1)} of recordings survive the listen back, and {pct(rates.submitRate, 1)} of the
            keepers get entered.
          </p>
          <p className="text-muted">
            A take counts as kept only while it is still kept or submitted. Someone who kept a take
            and then discarded it drops out of that row, so keep is a floor, not a ceiling.
          </p>
        </div>
      </Card>

      <Card title="Does the habit form">
        <p className="text-xs text-muted">Distinct players who submitted, last 14 days.</p>
        <div className="flex flex-col gap-1">
          {habit.series.map((day) => (
            <Bar
              key={day.dayKey}
              label={day.dayKey.slice(5)}
              count={day.submitters}
              share={day.submitters / seriesPeak}
              muted={day.dayKey === today}
            />
          ))}
        </div>
        <p className="text-[10px] text-muted">Today is still open, so its bar is a partial day.</p>
        <div className="mt-1 grid grid-cols-3 border-t border-b border-ink py-2">
          <div className="flex flex-col gap-0.5 px-1">
            <span className="font-display text-2xl">{pct(habit.d7Rate)}</span>
            <span className="text-[10px] tracking-[0.08em] text-muted uppercase">d7 return</span>
          </div>
          <div className="flex flex-col gap-0.5 border-l border-dotted border-rule px-2">
            <span className="font-display text-2xl">{habit.medianCurrentStreak}</span>
            <span className="text-[10px] tracking-[0.08em] text-muted uppercase">median run</span>
          </div>
          <div className="flex flex-col gap-0.5 border-l border-dotted border-rule px-2">
            <span className="font-display text-2xl">{habit.maxCurrentStreak}</span>
            <span className="text-[10px] tracking-[0.08em] text-muted uppercase">longest live run</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          D7 return: of the {num.format(habit.d7Cohort)} player
          {habit.d7Cohort === 1 ? "" : "s"} whose first submission was 7 or more days ago,{" "}
          {num.format(habit.d7Returned)} submitted again on a later day. The PRD §15 kill line is
          about {pct(KILL_D7_RATE)}.
          {habit.d7Rate !== null && habit.d7Rate < KILL_D7_RATE ? " Currently under it." : ""}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Runs are measured over {num.format(habit.streakPopulation)} player
          {habit.streakPopulation === 1 ? "" : "s"} with at least one submission. Best run ever
          recorded: {num.format(habit.maxBestStreak)} day{habit.maxBestStreak === 1 ? "" : "s"}.
        </p>
      </Card>

      <Card title="Used versus avoided">
        <p className="text-xs text-muted">
          Which submitted take people settle on. Take 1 means first try; take 3 means they spent
          the whole free allowance.
        </p>
        <div className="flex flex-col gap-1">
          {usage.takeNumbers.length === 0 ? (
            <p className="text-xs text-muted">No submissions yet.</p>
          ) : (
            usage.takeNumbers.map((slice) => (
              <Bar
                key={slice.takeNumber}
                label={`take ${slice.takeNumber}`}
                count={slice.submissions}
                share={slice.submissions / takePeak}
              />
            ))
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Average submitted take number:{" "}
          {usage.avgSubmittedTakeNumber === null ? "no data" : usage.avgSubmittedTakeNumber.toFixed(2)}. Players
          registered {num.format(funnel.all.takesRegistered)} takes across{" "}
          {num.format(funnel.all.playerDays)} player day{funnel.all.playerDays === 1 ? "" : "s"}, which is{" "}
          {funnel.all.playerDays > 0 ? (funnel.all.takesRegistered / funnel.all.playerDays).toFixed(2) : "no data"} attempts
          per player per day out of a free allowance of 3.
        </p>
        <dl className="mt-1 flex flex-col gap-1 border-t border-ink pt-2 text-xs">
          {[
            { term: "Share links created", value: num.format(usage.sharesCreated), detail: `${num.format(usage.sharesCreated30)} in the last 30 days` },
            { term: "Share links still live", value: num.format(usage.sharesLive), detail: `${num.format(usage.sharesRevoked)} revoked by their owner` },
            { term: "Reports filed", value: num.format(usage.reportsFiled), detail: `${num.format(usage.reportsOpen)} still open` },
            { term: "Practice takes", value: num.format(usage.practiceTakes), detail: `${num.format(usage.practiceUsers)} account${usage.practiceUsers === 1 ? "" : "s"} have used practice mode` },
            { term: "Workshop entries", value: num.format(usage.workshopEntries), detail: `${num.format(usage.workshopWriters)} writer${usage.workshopWriters === 1 ? "" : "s"}` },
          ].map((item) => (
            <div key={item.term} className="flex items-baseline justify-between gap-2 border-t border-dotted border-rule pt-1 first:border-t-0 first:pt-0">
              <dt className="min-w-0">
                {item.term}
                <span className="block text-[10px] text-muted">{item.detail}</span>
              </dt>
              <dd className="shrink-0 font-display text-lg">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-relaxed text-muted">
          {sharesPerSubmission === null
            ? "Shares per submitted take: no data."
            : `Shares per submitted take: ${sharesPerSubmission.toFixed(2)}.`}{" "}
          {reportsPer100Shares === null
            ? "Reports per 100 shares: no data."
            : `Reports per 100 shares: ${reportsPer100Shares.toFixed(1)}.`}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Guild visits are not tracked. Nothing records a page view in our database, so we cannot
          say here whether people open the Guild, the Archive, or the upgrade page. That question
          belongs to PostHog.
        </p>
      </Card>

      <Card title="Who is here">
        <div className="flex flex-col gap-1">
          {population.plans.map((slice) => (
            <Bar key={slice.plan} label={slice.plan} count={slice.players} share={slice.players / planPeak} />
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted">
          {num.format(population.players)} player account{population.players === 1 ? "" : "s"} plus{" "}
          {num.format(population.admins)} admin account{population.admins === 1 ? "" : "s"} that are left out
          of the numbers above. {num.format(population.new7)} joined in the last 7 days,{" "}
          {num.format(population.new30)} in the last 30.
        </p>
        <p className="text-xs leading-relaxed text-muted">
          {num.format(population.stripePurchases)} Stripe purchase
          {population.stripePurchases === 1 ? "" : "s"} recorded, {money(population.stripeCents)} total. Cash
          App lifetimes are granted by hand and show up in the lifetime plan count, not here. See{" "}
          <Link href="/admin/cashapp" className="text-moss underline-offset-4 hover:underline">
            Cash App claims
          </Link>
          .
        </p>
      </Card>

      <Card title="Not measured here">
        <ul className="flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-muted">
          <li>Page views and which screens people open, including the Guild and the Archive.</li>
          <li>Spinning without recording: a visitor who reads the recipe and leaves registers no take, so they are invisible to the funnel above.</li>
          <li>Share link visits, and whether a visit turned into a new player.</li>
          <li>Signed-out visitors of any kind. Every number above needs an account.</li>
          <li>New WitUS accounts created through VoGoat. That one is measurable at the identity provider.</li>
        </ul>
        <p className="text-xs leading-relaxed text-muted">
          PostHog carries those.{" "}
          {hasPostHog
            ? "The project key is set, so events are being collected."
            : "The project key is not set yet, so nothing is being collected and the dashboards will be empty."}
        </p>
        <a
          href={POSTHOG_URL}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center justify-center rounded-md border border-rule text-sm font-semibold text-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Open PostHog
        </a>
      </Card>
    </main>
  );
}
