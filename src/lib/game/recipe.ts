// The recipe space (PRD §4): eight wheels, 11,664 combinations. Pure module, no I/O.
// The id ↔ recipe mapping mirrors the row order of data/voice-recipes.csv (effort outermost,
// attitude innermost) so a daily can reference a recipe by CSV id without loading the file.

export const WHEELS = ["effort", "placement", "air", "age", "size", "tempo", "volume", "attitude"] as const;
export type Wheel = (typeof WHEELS)[number];

export const WHEEL_VALUES = {
  effort: ["dab", "flick", "press", "punch", "wring", "slash", "glide", "float"],
  placement: ["nasal", "throaty", "balanced"],
  air: ["breathy", "dry"],
  age: ["kid-ish", "adult", "elder"],
  size: ["tiny", "medium", "huge"],
  tempo: ["slow", "steady", "rapid"],
  volume: ["hushed", "medium", "big"],
  attitude: ["friendly", "deadpan", "menacing"],
} as const satisfies Record<Wheel, readonly string[]>;

export type Recipe = { [W in Wheel]: (typeof WHEEL_VALUES)[W][number] };

export const RECIPE_COUNT = 11_664;

/** One-line plain-English coaching hint per wheel value; newcomers have never heard "Laban". */
export const HINTS: Record<string, string> = {
  dab: "light, direct, sudden. Little taps of sound.",
  flick: "light, indirect, sudden. Quick flicks that skitter away.",
  press: "strong, direct, sustained. Leaning on every word.",
  punch: "strong, direct, sudden. Each word lands like a blow.",
  wring: "strong, indirect, sustained. Twisting the sound out.",
  slash: "strong, indirect, sudden. Big sudden sweeps.",
  glide: "light, direct, sustained. Smooth and unbroken.",
  float: "light, indirect, sustained. The voice drifts and doesn't quite land.",
  nasal: "The sound lives up in the nose.",
  throaty: "The sound sits down in the throat.",
  balanced: "Right in the middle, nothing pushed.",
  breathy: "Lots of air in the tone.",
  dry: "No air at all, just tone.",
  "kid-ish": "Young, bright, a little unfiltered.",
  adult: "Grown, settled, in control.",
  elder: "Years in the voice, slower starts.",
  tiny: "A small body, so the voice sits high.",
  medium: "Middle of the road, in size and pitch.",
  huge: "A big body, so the voice sits low.",
  slow: "Take your time on every word.",
  steady: "An even, walking pace.",
  rapid: "Fast, but every word still lands.",
  hushed: "Barely carries across a table.",
  big: "Fills the room.",
  friendly: "Warm, open, glad you're here.",
  deadpan: "Flat, dry, unimpressed.",
  menacing: "A threat, delivered politely.",
};

/** Row id in data/voice-recipes.csv (1-based) for a recipe. */
export function recipeId(r: Recipe): number {
  let id = 0;
  for (const w of WHEELS) {
    const values: readonly string[] = WHEEL_VALUES[w];
    id = id * values.length + values.indexOf(r[w]);
  }
  return id + 1;
}

/** Inverse of `recipeId`. Throws on an out-of-range id. */
export function recipeFromId(id: number): Recipe {
  if (!Number.isInteger(id) || id < 1 || id > RECIPE_COUNT) throw new RangeError(`recipe id out of range: ${id}`);
  let rest = id - 1;
  const out: Partial<Record<Wheel, string>> = {};
  for (let i = WHEELS.length - 1; i >= 0; i--) {
    const w = WHEELS[i];
    const values: readonly string[] = WHEEL_VALUES[w];
    out[w] = values[rest % values.length];
    rest = Math.floor(rest / values.length);
  }
  return out as Recipe;
}

/** The five traits on the share card, in the PRD's order: size, attitude, age, volume, effort. */
export function headlineTraits(r: Recipe): string[] {
  return [r.size, r.attitude, r.age, r.volume, r.effort];
}
