// Recipe sampling for dailies (PRD §6.1): never reuse a recipe, and bias for variety against
// the recent window so no two "menacing huge" days land back to back.
import { seededRandom, randomInt } from "./random";
import { RECIPE_COUNT, recipeFromId, type Recipe } from "./recipe";

export const RECENT_WINDOW_DAYS = 14;
const MAX_DRAWS = 200;

export type SamplerInput = {
  /** Deterministic seed, normally the day key. */
  seed: string;
  /** Recipe ids already used by any daily (any status). */
  usedIds: ReadonlySet<number>;
  /** Recipes of the most recent dailies, newest first (yesterday at index 0). */
  recent: readonly Recipe[];
};

/** True when `candidate` is too close to the recent window to feel fresh. */
export function isStale(candidate: Recipe, recent: readonly Recipe[]): boolean {
  const window = recent.slice(0, RECENT_WINDOW_DAYS);
  const yesterday = window[0];
  if (yesterday && (yesterday.effort === candidate.effort || yesterday.attitude === candidate.attitude)) return true;
  return window.some((r) => r.size === candidate.size && r.attitude === candidate.attitude && r.age === candidate.age);
}

/**
 * Picks an unused recipe id, preferring fresh ones; relaxes the variety rule only after many
 * draws so a long-running game never stalls. Throws only when every recipe has been used
 * (31 years in).
 */
export function pickRecipeId({ seed, usedIds, recent }: SamplerInput): number {
  if (usedIds.size >= RECIPE_COUNT) throw new Error("every recipe has been used");
  const next = seededRandom(`recipe:${seed}`);
  let fallback: number | undefined;
  for (let i = 0; i < MAX_DRAWS; i++) {
    const id = randomInt(next, RECIPE_COUNT) + 1;
    if (usedIds.has(id)) continue;
    fallback ??= id;
    if (!isStale(recipeFromId(id), recent)) return id;
  }
  if (fallback !== undefined) return fallback;
  // Dense usage: walk from a seeded start to the first unused id.
  const start = randomInt(next, RECIPE_COUNT) + 1;
  for (let k = 0; k < RECIPE_COUNT; k++) {
    const id = ((start - 1 + k) % RECIPE_COUNT) + 1;
    if (!usedIds.has(id)) return id;
  }
  throw new Error("every recipe has been used");
}
