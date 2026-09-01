// Never-dark fallback (PRD §6.6): if a date arrives with no approved daily, assemble one
// deterministically from an unused recipe and a backlog script, marked `auto` and flagged for
// retroactive review. Streaks must never break because authoring fell behind.
import { deriveCreature, type DerivedCreature } from "./creature";
import { seededRandom, randomInt } from "./random";
import { recipeFromId, type Recipe } from "./recipe";
import { pickRecipeId } from "./sampler";

export type FallbackScript = { id: string; body: string };

export type FallbackDaily = {
  recipeId: number;
  recipe: Recipe;
  scriptId: string;
  creature: DerivedCreature;
};

export type FallbackInput = {
  dayKey: string;
  usedRecipeIds: ReadonlySet<number>;
  recentRecipes: readonly Recipe[];
  /** Scripts eligible for pairing: status `backlog` first, then unused `use` (invariant 3). */
  scripts: readonly FallbackScript[];
};

/** Same inputs, same daily, on every instance. Returns null when no approved script exists. */
export function assembleFallback({ dayKey, usedRecipeIds, recentRecipes, scripts }: FallbackInput): FallbackDaily | null {
  if (scripts.length === 0) return null;
  const recipeId = pickRecipeId({ seed: dayKey, usedIds: usedRecipeIds, recent: recentRecipes });
  const recipe = recipeFromId(recipeId);
  const script = scripts[randomInt(seededRandom(`script:${dayKey}`), scripts.length)];
  return { recipeId, recipe, scriptId: script.id, creature: deriveCreature(recipe, recipeId) };
}
