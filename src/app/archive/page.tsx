import type { Metadata } from "next";
import Link from "next/link";
import { CreatureSvg } from "@/components/creature-svg";
import { getDb } from "@/db/client";
import { listArchiveDays } from "@/lib/archive";
import { dayKey } from "@/lib/game/day";
import { headlineTraits } from "@/lib/game/recipe";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Every specimen so far",
  description: "Every VO GOAT daily to date: the creature, the eight-wheel voice recipe, and the mundane line everyone read that day.",
  alternates: { canonical: "/archive" },
};

/** The public archive (BAM, 2026-09-02): one page per past day, all indexable. */
export default async function ArchivePage() {
  const db = await getDb();
  const days = await listArchiveDays(db, dayKey(new Date(), env.DAILY_TIMEZONE), env.LAUNCH_DATE);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <h1 className="font-display text-3xl leading-tight italic">Every specimen so far.</h1>
      <p className="text-sm leading-relaxed text-muted">
        One absurd voice recipe a day, the same for everyone on Earth. Today&apos;s stays a
        surprise until midnight UTC.
      </p>
      {days.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">
          The first specimen is still out there. Come back tomorrow.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {days.map((day) => (
            <li key={day.dayKey}>
              <Link href={`/day/${day.dayKey}`} className="flex items-center gap-3 rounded-md border border-rule bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                <CreatureSvg layers={day.layers} variant="plate" size={56} />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                    No. {day.dayNumber} · {day.dayKey}
                  </span>
                  <span className="block font-display text-lg leading-snug italic">{day.creatureName}</span>
                  <span className="block text-xs text-muted">{headlineTraits(day.recipe).join(" · ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
