import { describe, expect, it } from "vitest";
import { isAdminEmail } from "@/lib/admin";

describe("admin bootstrap rule (invariant 7)", () => {
  it("matches case-insensitively and trims", () => {
    expect(isAdminEmail("BAM@awews.com ", "bam@awews.com")).toBe(true);
    expect(isAdminEmail("bam@awews.com", " BAM@AWEWS.COM")).toBe(true);
  });
  it("never matches when ADMIN_EMAIL is unset", () => {
    expect(isAdminEmail("bam@awews.com", undefined)).toBe(false);
    expect(isAdminEmail("bam@awews.com", "")).toBe(false);
  });
  it("does not match other addresses", () => {
    expect(isAdminEmail("someone@example.com", "bam@awews.com")).toBe(false);
  });
});
