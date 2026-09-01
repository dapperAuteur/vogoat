import { describe, expect, it } from "vitest";
import { assembleFallback } from "@/lib/game/never-dark";
import { recipeFromId } from "@/lib/game/recipe";
import { isStale, pickRecipeId } from "@/lib/game/sampler";

describe("recipe sampler", () => {
  it("is deterministic for a seed and never returns a used id", () => {
    const used = new Set([1, 2, 3, 4, 5]);
    const a = pickRecipeId({ seed: "2026-09-01", usedIds: used, recent: [] });
    const b = pickRecipeId({ seed: "2026-09-01", usedIds: used, recent: [] });
    expect(a).toBe(b);
    expect(used.has(a)).toBe(false);
    expect(pickRecipeId({ seed: "2026-09-02", usedIds: used, recent: [] })).not.toBe(a);
  });

  it("avoids yesterday's effort and attitude and recent size/attitude/age triples", () => {
    const yesterday = recipeFromId(6432);
    const id = pickRecipeId({ seed: "x", usedIds: new Set(), recent: [yesterday] });
    const r = recipeFromId(id);
    expect(r.effort).not.toBe(yesterday.effort);
    expect(r.attitude).not.toBe(yesterday.attitude);
    expect(isStale(yesterday, [yesterday])).toBe(true);
  });

  it("still returns an unused id when usage is dense", () => {
    const used = new Set<number>();
    for (let i = 1; i <= 11_664; i++) if (i !== 7777) used.add(i);
    expect(pickRecipeId({ seed: "dense", usedIds: used, recent: [] })).toBe(7777);
    used.add(7777);
    expect(() => pickRecipeId({ seed: "dense", usedIds: used, recent: [] })).toThrow(/every recipe/);
  });
});

describe("never-dark fallback", () => {
  const scripts = [
    { id: "s1", body: "Please remember to defrost the chicken before Thursday." },
    { id: "s2", body: "The remote control is under the couch cushion, where it always is." },
  ];

  it("assembles the same daily for the same inputs and a full creature", () => {
    const input = { dayKey: "2026-09-03", usedRecipeIds: new Set<number>(), recentRecipes: [], scripts };
    const a = assembleFallback(input);
    const b = assembleFallback(input);
    expect(a).toEqual(b);
    expect(a?.creature.name).toMatch(/^The /);
    expect(scripts.map((s) => s.id)).toContain(a?.scriptId);
  });

  it("refuses to invent a script (invariant 3)", () => {
    expect(assembleFallback({ dayKey: "2026-09-03", usedRecipeIds: new Set(), recentRecipes: [], scripts: [] })).toBeNull();
  });
});
