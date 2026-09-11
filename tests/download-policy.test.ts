import { describe, expect, it } from "vitest";
import { canDownloadTake, downloadWindowEndsAt, hasPaidPerks } from "@/lib/takes/download-policy";

const recorded = new Date("2026-09-10T12:00:00Z");
const free = { plan: "free", role: "player" };

describe("download policy (BAM, 2026-09-10)", () => {
  it("gives paid perks to lifetime, subscribers, and admin on any plan", () => {
    expect(hasPaidPerks({ plan: "lifetime", role: "player" })).toBe(true);
    expect(hasPaidPerks({ plan: "subscriber", role: "player" })).toBe(true);
    expect(hasPaidPerks({ plan: "free", role: "admin" })).toBe(true);
    expect(hasPaidPerks(free)).toBe(false);
    expect(hasPaidPerks(null)).toBe(false);
  });

  it("lets free plans download for 24 hours after recording, then closes", () => {
    expect(downloadWindowEndsAt(recorded).toISOString()).toBe("2026-09-11T12:00:00.000Z");
    expect(canDownloadTake({ user: free, takeCreatedAt: recorded, now: new Date("2026-09-10T12:00:00Z") })).toBe(true);
    expect(canDownloadTake({ user: free, takeCreatedAt: recorded, now: new Date("2026-09-11T12:00:00Z") })).toBe(true);
    expect(canDownloadTake({ user: free, takeCreatedAt: recorded, now: new Date("2026-09-11T12:00:01Z") })).toBe(false);
  });

  it("lets paid plans and admin download any time, and nobody signed out", () => {
    const later = new Date("2026-10-05T00:00:00Z");
    expect(canDownloadTake({ user: { plan: "lifetime", role: "player" }, takeCreatedAt: recorded, now: later })).toBe(true);
    expect(canDownloadTake({ user: { plan: "free", role: "admin" }, takeCreatedAt: recorded, now: later })).toBe(true);
    expect(canDownloadTake({ user: null, takeCreatedAt: recorded, now: recorded })).toBe(false);
  });
});
