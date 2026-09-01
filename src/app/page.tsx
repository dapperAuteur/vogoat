import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CreatureSvg } from "@/components/creature-svg";
import { Countdown } from "@/components/daily/countdown";
import { WheelTable } from "@/components/daily/wheel-table";
import { KeptTakeControls } from "@/components/take/kept-take-controls";
import { TakeRecorder } from "@/components/take/take-recorder";
import { getDb } from "@/db/client";
import type { Plan } from "@/db/schema";
import { getTodaysDaily, NoScriptAvailableError, type DailyView } from "@/lib/daily";
import { formatShareText } from "@/lib/game/share-card";
import { SharePanel } from "@/components/share/share-panel";
import { share as shareTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { BaseAnimal } from "@/lib/game/creature";
import { nextDayBoundary } from "@/lib/game/day";
import { env } from "@/lib/env";
import { getSession, type SessionUser } from "@/lib/session";
import { listTakes, takeLimitFor, type TakeView } from "@/lib/takes/core";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const user = session ? (session.user as SessionUser) : null;
  let daily: DailyView | null = null;
  try {
    daily = await getTodaysDaily();
  } catch (error: unknown) {
    if (!(error instanceof NoScriptAvailableError)) throw error;
  }
  let takes: TakeView[] = [];
  let limit: number | null = null;
  if (user && daily) {
    const db = await getDb();
    takes = await listTakes(db, { userId: user.id, dailyId: daily.id });
    limit = takeLimitFor(user.plan as Plan);
  }
  const submitted = takes.find((t) => t.status === "submitted");
  const kept = takes.filter((t) => t.status === "kept");
  let activeShareSlug: string | null = null;
  if (submitted) {
    const db = await getDb();
    const [row] = await db
      .select({ slug: shareTable.slug })
      .from(shareTable)
      .where(and(eq(shareTable.takeId, submitted.id), isNull(shareTable.revokedAt)));
    activeShareSlug = row?.slug ?? null;
  }
  const boundary = nextDayBoundary(new Date(), env.DAILY_TIMEZONE).getTime();

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
          {daily ? <span className="text-sm font-semibold text-muted">No. {daily.dayNumber}</span> : null}
        </div>
        {session && user ? (
          <div className="flex items-center gap-1">
            <Link
              href="/menagerie"
              className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Menagerie
            </Link>
            {user.role === "admin" ? (
              <Link
                href="/admin/scripts"
                className="flex min-h-11 items-center px-2 text-sm font-semibold text-ochre underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Scripts
              </Link>
            ) : null}
            {user.role === "admin" ? (
              <Link
                href="/admin/creatures"
                className="flex min-h-11 items-center px-2 text-sm font-semibold text-ochre underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Creatures
              </Link>
            ) : null}
            <span className="text-sm font-semibold text-muted">{user.name}</span>
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
              <CreatureSvg
                layers={daily.creature.layers}
                variant={submitted ? "plate" : "outline"}
                size={104}
                title={`${daily.creature.name}, ${submitted ? "recorded" : "unrecorded"}`}
              />
              <span className="text-[10px] tracking-[0.12em] text-muted uppercase">
                Plate {daily.dayNumber} · {submitted ? "recorded" : "unrecorded"}
              </span>
            </div>
            <p className="self-center text-sm leading-relaxed text-muted">
              {submitted ? (
                <>
                  Added to{" "}
                  <Link href="/menagerie" className="font-semibold text-moss underline-offset-4 hover:underline">
                    your Menagerie
                  </Link>
                  . Come back for tomorrow&apos;s specimen.
                </>
              ) : (
                "The plate fills in when you submit a take. Spinning and rehearsing never need an account."
              )}
            </p>
          </section>

          <section className="px-1">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Read aloud</p>
            <p className="reveal-row mt-1 font-display text-2xl leading-snug" style={{ animationDelay: "1.2s" }}>
              {daily.script.body}
            </p>
          </section>

          {kept.length > 0 ? (
            <section className="flex flex-col gap-3" aria-label="Your kept takes">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Your kept takes</p>
              {kept.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 rounded-md border border-rule bg-card p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold">Take {t.takeNumber}</span>
                    <span className="text-xs text-muted">{t.durationMs ? `${(t.durationMs / 1000).toFixed(1)}s` : ""}</span>
                  </div>
                  <audio controls preload="none" src={`/api/takes/${t.id}/audio`} className="w-full" />
                  <KeptTakeControls takeId={t.id} canSubmit={!submitted} />
                </div>
              ))}
            </section>
          ) : null}
          {submitted && daily ? (
            <>
              <p role="status" className="rounded-md border border-moss px-3 py-2 text-sm font-semibold text-moss">
                Submitted: take {submitted.takeNumber}
                {limit !== null ? ` of ${limit}` : ""}. One entry per day, every tier.
              </p>
              <SharePanel
                takeId={submitted.id}
                cardText={formatShareText({
                  dayNumber: daily.dayNumber,
                  recipe: daily.recipe,
                  baseAnimal: daily.creature.baseAnimal as BaseAnimal,
                  takeNumber: submitted.takeNumber,
                  takeLimit: limit,
                  url: "",
                }).replace(/ · $/, "")}
                siteUrl={env.APP_URL}
                slug={activeShareSlug}
              />
            </>
          ) : null}
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
        {daily && !submitted ? (
          <TakeRecorder dailyId={daily.id} isSignedIn={Boolean(user)} attemptCount={takes.length} limit={limit} />
        ) : null}
        {!daily ? (
          <p className="text-center text-xs leading-relaxed text-muted">
            Audio stays on your device until you keep a take. Free plan: 3 takes a day.
          </p>
        ) : null}
        <p className="text-center text-xs text-muted">
          Next specimen at midnight UTC<Countdown deadlineMs={boundary} />
        </p>
      </div>
    </main>
  );
}
