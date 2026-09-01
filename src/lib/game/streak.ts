// Streaks from submitted-day keys (PRD §12: computed, never stored). A missed day breaks the
// current run and cannot be back-filled; today still counts as "open" until it is submitted,
// so a run ending yesterday is still the current streak.
import { shiftDay, type DayKey } from "./day";

export type Streaks = { current: number; best: number };

export function computeStreaks(submittedDayKeys: readonly string[], today: DayKey): Streaks {
  const days = [...new Set(submittedDayKeys)].sort();
  if (days.length === 0) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === shiftDay(days[i - 1] as DayKey, 1) ? run + 1 : 1;
    if (run > best) best = run;
  }
  const last = days[days.length - 1];
  const current = last === today || last === shiftDay(today, -1) ? run : 0;
  return { current, best };
}

export const GOAT_MILESTONES = [7, 30, 100] as const;

export function nextGoat(current: number): number | null {
  return GOAT_MILESTONES.find((m) => current < m) ?? null;
}
