import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, resetRateLimits } from "@/lib/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to max within the window, then limits", () => {
    for (let i = 0; i < 5; i++) expect(isRateLimited("k", 5, 60_000)).toBe(false);
    expect(isRateLimited("k", 5, 60_000)).toBe(true);
    expect(isRateLimited("other", 5, 60_000)).toBe(false);
  });

  it("resets after the window", () => {
    expect(isRateLimited("w", 1, -1)).toBe(false); // window already past
    expect(isRateLimited("w", 1, -1)).toBe(false);
  });
});
