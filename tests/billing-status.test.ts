import { describe, expect, it } from "vitest";
import { stripeModeFor } from "@/lib/billing/status";

describe("stripe mode detection", () => {
  it("distinguishes live, test, unconfigured, and unknown keys", () => {
    expect(stripeModeFor("sk_live_abc")).toBe("live");
    expect(stripeModeFor("rk_live_abc")).toBe("live");
    expect(stripeModeFor("sk_test_abc")).toBe("test");
    expect(stripeModeFor(undefined)).toBe("unconfigured");
    expect(stripeModeFor("pk_live_abc")).toBe("unknown");
  });
});
