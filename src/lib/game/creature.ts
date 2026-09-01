// The creature derives from the recipe, never from the user's audio (invariant 6).
// size → base animal, attitude → expression, age → accessory, effort → pose.
import type { Recipe } from "./recipe";

export const ANIMALS_BY_SIZE = {
  tiny: ["mouse", "frog", "hummingbird", "hamster"],
  medium: ["fox", "raccoon", "goose", "cat"],
  huge: ["bear", "moose", "walrus", "elephant"],
} as const;
export type BaseAnimal = (typeof ANIMALS_BY_SIZE)[keyof typeof ANIMALS_BY_SIZE][number] | "goat";

export type CreatureLayers = {
  baseAnimal: BaseAnimal;
  expression: Recipe["attitude"];
  accessory: "cap" | "none" | "glasses";
  pose: Recipe["effort"];
};

export type DerivedCreature = { name: string; baseAnimal: BaseAnimal; layers: CreatureLayers };

const AGE_WORD: Record<Recipe["age"], string> = { "kid-ish": "Young", adult: "Grown", elder: "Elder" };
const AGE_ACCESSORY: Record<Recipe["age"], CreatureLayers["accessory"]> = { "kid-ish": "cap", adult: "none", elder: "glasses" };

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Deterministic derivation: the base animal is chosen within the size class by recipe id, so
 * the same daily always yields the same creature; admin may pass an override to reroll within
 * the class (PRD §6.3). The goat is reserved for milestones and never derived here.
 */
export function deriveCreature(
  recipe: Recipe,
  recipeId: number,
  animalOverride?: BaseAnimal,
  excludedAnimals?: ReadonlySet<string>,
): DerivedCreature {
  const full = ANIMALS_BY_SIZE[recipe.size];
  const filtered = excludedAnimals ? full.filter((a) => !excludedAnimals.has(a)) : [...full];
  // A size class emptied by vetting falls back to the full class: the daily never goes dark.
  const pool = filtered.length > 0 ? filtered : [...full];
  const baseAnimal: BaseAnimal = animalOverride ?? pool[recipeId % pool.length];
  const layers: CreatureLayers = {
    baseAnimal,
    expression: recipe.attitude,
    accessory: AGE_ACCESSORY[recipe.age],
    pose: recipe.effort,
  };
  const name = `The ${cap(recipe.size)} ${cap(recipe.attitude)} ${AGE_WORD[recipe.age]} ${cap(baseAnimal)}`;
  return { name, baseAnimal, layers };
}

/** Emoji glyph for the share text card (the emoji is the medium in a chat, as in Wordle's grid). */
export const ANIMAL_EMOJI: Record<BaseAnimal, string> = {
  mouse: "🐁", frog: "🐸", hummingbird: "🐦", hamster: "🐹",
  fox: "🦊", raccoon: "🦝", goose: "🦢", cat: "🐈",
  bear: "🐻", moose: "🦌", walrus: "🦭", elephant: "🐘",
  goat: "🐐",
};
