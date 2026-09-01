import type { Metadata } from "next";
import Link from "next/link";
import { CreatureSvg } from "@/components/creature-svg";
import { getDb } from "@/db/client";
import { listAnimalVerdicts } from "@/lib/creatures/vetting";
import { ANIMALS_BY_SIZE, type BaseAnimal, type CreatureLayers } from "@/lib/game/creature";
import { requireAdmin } from "@/lib/session";
import { submitAnimalVerdict } from "./actions";

export const metadata: Metadata = { title: "Creature vetting", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  candidate: "border-rule text-muted",
  use: "border-moss text-moss",
  backlog: "border-ochre text-ochre",
  never: "border-rule text-muted line-through",
};

const EXPRESSIONS: CreatureLayers["expression"][] = ["friendly", "deadpan", "menacing"];

/** BAM vets the placeholder art (plans/future/02). Animals stay live unless marked never. */
export default async function CreatureVettingPage() {
  await requireAdmin();
  const db = await getDb();
  const rows = await listAnimalVerdicts(db);
  const byAnimal = new Map(rows.map((r) => [r.animal, r]));
  const unvetted = rows.filter((r) => r.status === "candidate").length;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Creature vetting</span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Admin
        </Link>
      </header>
      <p className="text-sm leading-relaxed text-muted">
        Every animal is <span className="font-semibold text-ink">live unless marked never</span>{" "}
        (so the daily can never go dark). Mark <span className="font-semibold text-ink">use</span>{" "}
        or <span className="font-semibold text-ink">backlog</span> to record an explicit yes;{" "}
        <span className="font-semibold text-ink">never</span> removes it from derivation (a size
        class with nothing left falls back to all of its animals). {unvetted} of {rows.length}{" "}
        not yet vetted. The goat is reserved for milestones and is not in the pool.
      </p>
      {(Object.entries(ANIMALS_BY_SIZE) as [string, readonly BaseAnimal[]][]).map(([size, animals]) => (
        <section key={size} className="flex flex-col gap-3">
          <h2 className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">{size}</h2>
          {animals.map((animal) => {
            const row = byAnimal.get(animal);
            const status = row?.status ?? "candidate";
            return (
              <div key={animal} className="rounded-md border border-rule bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg capitalize">{animal}</p>
                  <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${STATUS_STYLE[status]}`}>
                    {status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {EXPRESSIONS.map((expression) => (
                    <CreatureSvg
                      key={expression}
                      layers={{ baseAnimal: animal, expression, accessory: expression === "deadpan" ? "glasses" : expression === "friendly" ? "cap" : "none", pose: "glide" }}
                      variant="plate"
                      size={72}
                      title={`${animal}, ${expression}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {(["use", "backlog", "never"] as const).map((verdict) => (
                    <form key={verdict} action={submitAnimalVerdict} className="flex-1">
                      <input type="hidden" name="animal" value={animal} />
                      <input type="hidden" name="verdict" value={verdict} />
                      <button
                        type="submit"
                        disabled={status === verdict}
                        className={`min-h-11 w-full rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-40 ${
                          verdict === "use" ? "border-moss bg-moss text-on-moss" : verdict === "backlog" ? "border-ochre text-ochre" : "border-rule text-muted"
                        }`}
                      >
                        {verdict}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      <p className="pb-4 text-xs leading-relaxed text-muted">
        This is the placeholder art set; the layers contract stays stable when real art replaces
        it, and your verdicts carry over by animal name.
      </p>
    </main>
  );
}
