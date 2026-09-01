import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatureSvg } from "@/components/creature-svg";
import { WheelTable } from "@/components/daily/wheel-table";
import { ReportForm } from "@/components/share/report-form";
import { getDb } from "@/db/client";
import { getShareView } from "@/lib/share/core";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const view = await getShareView(db, slug);
  return {
    // Unguessable and unlisted (PRD §11): never indexed, title spoils nothing beyond the card.
    robots: { index: false, follow: false },
    title: view ? view.creatureName : "Not found",
  };
}

/** The shared page: the card plus optional audio; the script text is the transcript (PRD §8). */
export default async function SharePage({ params }: Params) {
  const { slug } = await params;
  const db = await getDb();
  const view = await getShareView(db, slug);
  if (!view) notFound();

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
        <span className="text-sm font-semibold text-muted">{view.dayKey}</span>
      </header>

      <section className="rounded-md border border-ink bg-card p-4">
        <div className="flex flex-col items-center gap-2">
          <CreatureSvg layers={view.layers} variant="plate" size={140} title={view.creatureName} />
          <h1 className="text-center font-display text-2xl leading-tight italic">{view.creatureName}</h1>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
            {view.performerName} · take {view.takeNumber}
          </p>
        </div>
        <div className="mt-3">
          {view.audioAvailable ? (
            <>
              {/* The script below is the transcript of this recording. */}
              <audio controls preload="none" src={`/api/share/${view.slug}/audio`} className="w-full" />
            </>
          ) : (
            <p className="rounded-sm bg-paper p-3 text-center text-sm text-muted">
              This take has expired. The creature is forever; free-plan audio lives 30 days.
            </p>
          )}
          <p className="mt-3 border-t border-dotted border-rule pt-3 text-center font-display text-lg leading-snug">
            &ldquo;{view.scriptBody}&rdquo;
          </p>
        </div>
      </section>

      <details className="rounded-md border border-rule bg-card p-3">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">The recipe they performed</summary>
        <div className="mt-2">
          <WheelTable recipe={view.recipe} />
        </div>
      </details>

      <p className="text-sm leading-relaxed text-muted">
        One shared voice recipe a day. Everyone got this same absurd recipe and this same mundane
        line; the results are gloriously different.{" "}
        <Link href="/" className="font-semibold text-moss underline-offset-4 hover:underline">
          Try today&apos;s
        </Link>
        .
      </p>

      <div className="mt-auto flex flex-col gap-2 pb-4">
        <ReportForm slug={view.slug} />
        <p className="text-xs leading-relaxed text-muted">
          Shared by its owner with this unlisted link. No voice-print analysis, no training data,
          ever; the owner can revoke this page at any time.
        </p>
      </div>
    </main>
  );
}
