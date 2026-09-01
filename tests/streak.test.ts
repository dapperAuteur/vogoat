import { describe, expect, it } from "vitest";
import { computeStreaks, nextGoat } from "@/lib/game/streak";

describe("streaks", () => {
  it("counts a run ending today or yesterday as current", () => {
    expect(computeStreaks(["2026-09-01", "2026-09-02", "2026-09-03"], "2026-09-03")).toEqual({ current: 3, best: 3 });
    expect(computeStreaks(["2026-09-01", "2026-09-02"], "2026-09-03")).toEqual({ current: 2, best: 2 });
  });

  it("a missed day breaks current but not best", () => {
    expect(computeStreaks(["2026-09-01", "2026-09-02", "2026-09-04"], "2026-09-06")).toEqual({ current: 0, best: 2 });
    expect(computeStreaks(["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-03"], "2026-09-03")).toEqual({ current: 1, best: 3 });
  });

  it("handles empties, duplicates, and month boundaries", () => {
    expect(computeStreaks([], "2026-09-01")).toEqual({ current: 0, best: 0 });
    expect(computeStreaks(["2026-08-31", "2026-08-31", "2026-09-01"], "2026-09-01")).toEqual({ current: 2, best: 2 });
  });

  it("names the next goat", () => {
    expect(nextGoat(0)).toBe(7);
    expect(nextGoat(7)).toBe(30);
    expect(nextGoat(150)).toBeNull();
  });
});
