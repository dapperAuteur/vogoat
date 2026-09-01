import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { animalVerdict } from "@/db/schema";
import { ANIMALS_BY_SIZE } from "@/lib/game/creature";
import type { Verdict } from "@/lib/scripts/triage";

/** Every vettable animal (the goat is milestone-only and never part of daily derivation). */
export const VETTABLE_ANIMALS = Object.values(ANIMALS_BY_SIZE).flat() as string[];

/** Rows for every animal, creating missing ones as `candidate` (lazy seed, idempotent). */
export async function listAnimalVerdicts(db: Db) {
  await db
    .insert(animalVerdict)
    .values(VETTABLE_ANIMALS.map((animal) => ({ animal })))
    .onConflictDoNothing({ target: animalVerdict.animal });
  return db.select().from(animalVerdict).orderBy(sql`${animalVerdict.animal} asc`);
}

export async function setAnimalVerdict(db: Db, animal: string, verdict: Verdict): Promise<boolean> {
  if (!VETTABLE_ANIMALS.includes(animal)) return false;
  const rows = await db
    .insert(animalVerdict)
    .values({ animal, status: verdict, decidedAt: new Date() })
    .onConflictDoUpdate({ target: animalVerdict.animal, set: { status: verdict, decidedAt: new Date() } })
    .returning({ id: animalVerdict.id });
  return rows.length > 0;
}
