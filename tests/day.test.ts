import { describe, expect, it } from "vitest";
import { dayKey, dayNumber, msUntilNextDay, nextDayBoundary, shiftDay } from "@/lib/game/day";

describe("the shared VoGoat day", () => {
  it("keys by calendar date in the configured zone", () => {
    const at = new Date("2026-09-01T23:30:00Z");
    expect(dayKey(at, "UTC")).toBe("2026-09-01");
    expect(dayKey(at, "America/Indiana/Indianapolis")).toBe("2026-09-01");
    expect(dayKey(new Date("2026-09-02T03:30:00Z"), "America/Indiana/Indianapolis")).toBe("2026-09-01");
    expect(dayKey(new Date("2026-09-02T03:30:00Z"), "UTC")).toBe("2026-09-02");
  });

  it("flips at the next local midnight, including across a DST change", () => {
    expect(nextDayBoundary(new Date("2026-09-01T10:00:00Z"), "UTC").toISOString()).toBe("2026-09-02T00:00:00.000Z");
    // EDT (UTC-4): local midnight Sept 2 is 04:00Z.
    expect(nextDayBoundary(new Date("2026-09-01T10:00:00Z"), "America/Indiana/Indianapolis").toISOString()).toBe(
      "2026-09-02T04:00:00.000Z",
    );
    // US DST ends 2026-11-01 at 2am local: the following midnight is EST (UTC-5).
    expect(nextDayBoundary(new Date("2026-11-01T12:00:00Z"), "America/Indiana/Indianapolis").toISOString()).toBe(
      "2026-11-02T05:00:00.000Z",
    );
    expect(msUntilNextDay(new Date("2026-09-01T23:00:00Z"), "UTC")).toBe(3_600_000);
  });

  it("numbers days from the launch date", () => {
    expect(dayNumber("2026-09-01", "2026-09-01")).toBe(1);
    expect(dayNumber("2026-10-01", "2026-09-01")).toBe(31);
    expect(shiftDay("2026-09-01", -1)).toBe("2026-08-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
  });
});
