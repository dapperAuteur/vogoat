import { ANIMAL_EMOJI, type BaseAnimal } from "./creature";
import { headlineTraits, type Recipe } from "./recipe";

/**
 * The spoiler-free text card (PRD §7.6). Middle dots, never dashes (shared conventions;
 * BAM 2026-08-31). The take number is the story: "take 2/3" is the flex.
 */
export function formatShareText(args: {
  dayNumber: number;
  recipe: Recipe;
  baseAnimal: BaseAnimal;
  takeNumber: number;
  takeLimit: number | null;
  url: string;
}): string {
  const takes = args.takeLimit !== null ? `take ${args.takeNumber}/${args.takeLimit}` : `take ${args.takeNumber}`;
  const emoji = ANIMAL_EMOJI[args.baseAnimal] ?? ANIMAL_EMOJI.goat;
  return `VO GOAT #${args.dayNumber} ${emoji} ${headlineTraits(args.recipe).join(" · ")} · ${takes} · ${args.url}`;
}
