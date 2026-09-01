// BAM's pricing (2026-09-01, witus task 79 step 1 answered):
//   Lifetime $103.29 · Lifetime via Cash App Pay $100.00 · Monthly $10.60 ·
//   Annual $103.29, offered only after 100 lifetime founders have bought.
export const PRICES = {
  lifetime: { cents: 10_329, label: "$103.29" },
  lifetimeCashApp: { cents: 10_000, label: "$100.00" },
  monthly: { cents: 1_060, label: "$10.60" },
  annual: { cents: 10_329, label: "$103.29" },
} as const;

export const ANNUAL_UNLOCK_AT = 100;

export function annualUnlocked(lifetimeSold: number): boolean {
  return lifetimeSold >= ANNUAL_UNLOCK_AT;
}
