// The shared "VoGoat day" (PRD §3: one daily for everyone). It flips at 00:00 in one IANA zone
// for the whole world (BAM, 2026-08-31: UTC). Pure functions; callers pass the zone from env.

export type DayKey = `${number}-${number}-${number}`;

const MS_PER_DAY = 86_400_000;

/** Calendar date of `at` in `timeZone`, as YYYY-MM-DD. */
export function dayKey(at: Date, timeZone: string): DayKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}` as DayKey;
}

/** Zone offset (minutes east of UTC) in effect at `at`. */
function offsetMinutes(at: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name ?? "");
  if (!m) return 0; // "GMT" alone = UTC
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** The instant the day after `at` begins in `timeZone` (next local midnight), DST-aware. */
export function nextDayBoundary(at: Date, timeZone: string): Date {
  const [y, mo, d] = dayKey(at, timeZone).split("-").map(Number);
  // Wall-clock midnight of the next calendar day, first as if UTC, then corrected for the
  // zone offset in effect at that instant (two passes cover a DST change at the boundary).
  let guess = new Date(Date.UTC(y, mo - 1, d + 1));
  for (let i = 0; i < 2; i++) {
    guess = new Date(Date.UTC(y, mo - 1, d + 1) - offsetMinutes(guess, timeZone) * 60_000);
  }
  return guess;
}

export function msUntilNextDay(at: Date, timeZone: string): number {
  return nextDayBoundary(at, timeZone).getTime() - at.getTime();
}

/** Public day number: LAUNCH_DATE is "VoGoat #1". Days before launch are ≤ 0. */
export function dayNumber(key: DayKey, launchDate: string): number {
  return Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${launchDate}T00:00:00Z`)) / MS_PER_DAY) + 1;
}

/** The key `days` calendar days after `key` (negative for before). */
export function shiftDay(key: DayKey, days: number): DayKey {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10) as DayKey;
}
