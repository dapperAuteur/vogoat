import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { ANIMALS_BY_SIZE, deriveCreature } from "@/lib/game/creature";
import { HINTS, RECIPE_COUNT, WHEELS, WHEEL_VALUES, headlineTraits, recipeFromId, recipeId, type Recipe } from "@/lib/game/recipe";

type Row = Record<string, string>;
const rows = parse(readFileSync("data/voice-recipes.csv"), { columns: true }) as Row[];

describe("recipe ids mirror data/voice-recipes.csv", () => {
  it("has the PRD's 11,664 rows", () => {
    expect(rows).toHaveLength(RECIPE_COUNT);
  });

  it("maps every id to the CSV row and back", () => {
    // One assertion, not one per field: 11,664 rows times eight wheels is ~93k expect() calls,
    // which timed out once the suite grew. Collect mismatches, then assert on the list.
    const mismatches: string[] = [];
    for (const row of rows) {
      const id = Number(row.id);
      const recipe = recipeFromId(id);
      for (const w of WHEELS) {
        if (recipe[w] !== row[w]) mismatches.push(`row ${id} ${w}: ${recipe[w]} != ${row[w]}`);
      }
      if (recipeId(recipe) !== id) mismatches.push(`row ${id}: recipeId round-trip returned ${recipeId(recipe)}`);
    }
    expect(mismatches).toEqual([]);
  });

  it("rejects out-of-range ids", () => {
    expect(() => recipeFromId(0)).toThrow(RangeError);
    expect(() => recipeFromId(RECIPE_COUNT + 1)).toThrow(RangeError);
  });

  it("ships a coaching hint for every wheel value", () => {
    for (const w of WHEELS) for (const v of WHEEL_VALUES[w]) expect(HINTS[v], v).toBeTruthy();
  });
});

describe("creature derivation", () => {
  const mouseDay: Recipe = {
    effort: "float", placement: "nasal", air: "breathy", age: "elder",
    size: "tiny", tempo: "slow", volume: "hushed", attitude: "menacing",
  };

  it("names the creature from the recipe (PRD §7 example)", () => {
    const c = deriveCreature(mouseDay, recipeId(mouseDay), "mouse");
    expect(c.name).toBe("The Tiny Menacing Elder Mouse");
    expect(c.layers).toEqual({ baseAnimal: "mouse", expression: "menacing", accessory: "glasses", pose: "float" });
  });

  it("stays inside the size class and is deterministic", () => {
    const a = deriveCreature(mouseDay, 5);
    const b = deriveCreature(mouseDay, 5);
    expect(a).toEqual(b);
    expect(ANIMALS_BY_SIZE.tiny).toContain(a.baseAnimal);
  });

  it("orders the share-card traits size, attitude, age, volume, effort", () => {
    expect(headlineTraits(mouseDay)).toEqual(["tiny", "menacing", "elder", "hushed", "float"]);
  });
});

describe("vetting-aware derivation", () => {
  const tinyDay: Recipe = {
    effort: "glide", placement: "balanced", air: "dry", age: "adult",
    size: "tiny", tempo: "steady", volume: "medium", attitude: "friendly",
  };

  it("skips excluded animals and falls back to the full class when emptied", () => {
    const excluded = new Set(["mouse", "frog", "hummingbird"]);
    for (let id = 1; id <= 40; id++) {
      expect(deriveCreature(tinyDay, id, undefined, excluded).baseAnimal).toBe("hamster");
    }
    const all = new Set(["mouse", "frog", "hummingbird", "hamster"]);
    expect(ANIMALS_BY_SIZE.tiny).toContain(deriveCreature(tinyDay, 5, undefined, all).baseAnimal);
  });
});
