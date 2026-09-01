import type { Metadata } from "next";
import Link from "next/link";
import { CreatureSvg } from "@/components/creature-svg";
import { WheelTable } from "@/components/daily/wheel-table";
import { PracticeRecorder } from "@/components/take/practice-recorder";
import { deriveCreature } from "@/lib/game/creature";
import { RECIPE_COUNT, recipeFromId } from "@/lib/game/recipe";
import { getSession, type SessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Practice", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The paid practice room (PRD §5): any of the 11,664 recipes on demand, nothing counted. */
export default async function PracticePage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const session = await getSession();
  const user = session ? (session.user as SessionUser) : null;
  const paid = user && user.plan !== "free";
  const { r } = await searchParams;
  const parsed = Number(r);
  const recipeId = Number.isInteger(parsed) && parsed >= 1 && parsed <= RECIPE_COUNT ? parsed : 1 + Math.floor(Math.random() * RECIPE_COUNT);
  const recipe = recipeFromId(recipeId);
  const creature = deriveCreature(recipe, recipeId);
  const next = 1 + Math.floor(Math.random() * RECIPE_COUNT);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
        <Link href="/" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Today
        </Link>
      </header>
      <h1 className="font-display text-3xl leading-tight italic">The practice room.</h1>
      {!paid ? (
        <section className="rounded-md border border-rule bg-card p-4">
          <p className="text-sm leading-relaxed text-muted">
            Spin any of the 11,664 recipes on demand and rehearse without touching the daily.
            The practice room comes with lifetime and subscription plans.
          </p>
          <Link href="/upgrade" className="mt-3 flex min-h-12 items-center justify-center rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
            See plans
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-md border border-rule bg-card p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Recipe {recipeId} of {RECIPE_COUNT}</span>
            </div>
            <h2 className="mt-1 font-display text-2xl leading-tight italic">{creature.name}</h2>
            <div className="mt-3">
              <WheelTable recipe={recipe} />
            </div>
          </section>
          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 rounded-md border border-rule bg-card p-2">
              <CreatureSvg layers={creature.layers} variant="plate" size={80} title={creature.name} />
            </div>
            <Link
              href={`/practice?r=${next}`}
              className="flex min-h-12 flex-1 items-center justify-center rounded-md border border-ink font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Spin another recipe
            </Link>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Read anything you like in this voice; yesterday&apos;s grocery list works. Nothing here
            is counted or uploaded.
          </p>
          <div className="mt-auto pb-2">
            <PracticeRecorder />
          </div>
        </>
      )}
    </main>
  );
}
