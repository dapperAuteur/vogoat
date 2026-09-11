// Who may download a stored take, and until when (BAM, 2026-09-10):
//   - paid plans (lifetime, subscriber) and admin: any time before the 30-day deletion
//   - free plan: within 24 hours of recording the take
// Pure so the rule is unit-tested; routes enforce it and the UI mirrors it.

export const FREE_DOWNLOAD_WINDOW_HOURS = 24;

type PerkUser = { plan: string; role: string } | null | undefined;

/** Paid perks (practice room, downloads any time). Admin gets them regardless of plan. */
export function hasPaidPerks(user: PerkUser): boolean {
  if (!user) return false;
  return user.plan === "lifetime" || user.plan === "subscriber" || user.role === "admin";
}

export function downloadWindowEndsAt(takeCreatedAt: Date): Date {
  return new Date(takeCreatedAt.getTime() + FREE_DOWNLOAD_WINDOW_HOURS * 3_600_000);
}

export function canDownloadTake(args: { user: PerkUser; takeCreatedAt: Date; now?: Date }): boolean {
  if (!args.user) return false;
  if (hasPaidPerks(args.user)) return true;
  return (args.now ?? new Date()).getTime() <= downloadWindowEndsAt(args.takeCreatedAt).getTime();
}
