import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatureSvg } from "@/components/creature-svg";
import { WheelTable } from "@/components/daily/wheel-table";
import { getDb } from "@/db/client";
import { getArchiveDay } from "@/lib/archive";
import { dayKey } from "@/lib/game/day";
import { headlineTraits } from "@/lib/game/recipe";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ date: string }> };

async function load(date: string) {
  const db = await getDb();
  return getArchiveDay(db, date, dayKey(new Date(), env.DAILY_TIMEZONE), env.LAUNCH_DATE);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  const day = await load(date);
  if (!day) return { title: "Not found", robots: { index: false } };
  const traits = headlineTraits(day.recipe).join(", ");
  return {
    title: `${day.creatureName} · VO GOAT No. ${day.dayNumber}`,
    description: `VO GOAT specimen No. ${day.dayNumber} (${day.dayKey}): everyone on Earth read "${day.scriptBody}" as ${traits}.`,
    alternates: { canonical: `/day/${day.dayKey}` },
  };
}

/** A past specimen, public and indexable (BAM, 2026-09-02). Today's is never here. */
export default async function ArchiveDayPage({ params }: Params) {
  const { date } = await params;
  const day = await load(date);
  if (!day) notFound();

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <Link href="/" className="font-display text-3xl tracking-wide italic">
          VO GOAT
        </Link>
        <Link href="/archive" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          All specimens
        </Link>
      </header>

      <article className="rounded-md border border-ink bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Specimen No. {day.dayNumber}</span>
          <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">{day.dayKey}</span>
        </div>
        <h1 className="mt-1 font-display text-3xl leading-tight italic">{day.creatureName}</h1>
        <div className="mt-3 flex justify-center">
          <CreatureSvg layers={day.layers} variant="plate" size={160} title={day.creatureName} />
        </div>
        <div className="mt-3">
          <WheelTable recipe={day.recipe} />
        </div>
        <div className="mt-4 border-t border-dotted border-rule pt-3">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">The line everyone read</p>
          <p className="mt-1 font-display text-2xl leading-snug">&ldquo;{day.scriptBody}&rdquo;</p>
        </div>
      </article>

      <p className="text-sm leading-relaxed text-muted">
        On {day.dayKey}, everyone on Earth got this same absurd recipe and this same mundane
        line. The results were gloriously different.
      </p>
      <Link href="/" className="flex min-h-12 items-center justify-center rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
        Hear what today&apos;s sounds like
      </Link>
      <p className="pb-4 text-xs leading-relaxed text-muted">
        Recordings are never public here: players share their own takes by handing out an
        unlisted link. <Link href="/voice-data" className="font-semibold text-moss underline-offset-4 hover:underline">The voice-data promise</Link>.
      </p>
    </main>
  );
}
