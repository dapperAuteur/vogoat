import type { Metadata } from "next";
import Link from "next/link";
import { CreatureSvg } from "@/components/creature-svg";
import { WheelTable } from "@/components/daily/wheel-table";
import { SpinAnother } from "@/components/practice/spin-another";
import { PracticeRecorder } from "@/components/take/practice-recorder";
import { PracticeTakeList } from "@/components/take/practice-take-list";
import { getDb } from "@/db/client";
import { listPracticeTakes } from "@/lib/practice/core";
import { deriveCreature } from "@/lib/game/creature";
import { dayKey } from "@/lib/game/day";
import { randomInt, seededRandom } from "@/lib/game/random";
import { env } from "@/lib/env";
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
  // Render-pure: with no ?r, the day seeds the starter recipe; Spin another randomizes client-side.
  const fallbackId = 1 + randomInt(seededRandom(`practice:${dayKey(new Date(), env.DAILY_TIMEZONE)}`), RECIPE_COUNT);
  const recipeId = Number.isInteger(parsed) && parsed >= 1 && parsed <= RECIPE_COUNT ? parsed : fallbackId;
  const recipe = recipeFromId(recipeId);
  const creature = deriveCreature(recipe, recipeId);
  const saved = paid
    ? (await listPracticeTakes(await getDb(), user.id)).map((row) => ({
        id: row.id,
        recipeId: row.recipeId,
        creatureName: deriveCreature(row.recipe, row.recipeId).name,
        durationMs: row.durationMs,
      }))
    : [];

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
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
            <SpinAnother />
          </div>
          <p className="text-sm leading-relaxed text-muted">
            Read anything you like in this voice; yesterday&apos;s grocery list works. Nothing here
            is counted or uploaded.
          </p>
          <PracticeTakeList items={saved} />
          <div className="mt-auto pb-2">
            <PracticeRecorder recipeId={recipeId} canSave={Boolean(paid)} />
          </div>
        </>
      )}
    </main>
  );
}
