import { getDb } from "@/db/client";
import { env } from "@/lib/env";
import { getDailyForToday, type DailyView } from "./get-daily";

/** Today's daily for the app (env-configured zone and launch date). */
export function getTodaysDaily(now?: Date): Promise<DailyView> {
  return getDb().then((db) => getDailyForToday(db, { timeZone: env.DAILY_TIMEZONE, launchDate: env.LAUNCH_DATE, now }));
}

export { NoScriptAvailableError, type DailyView } from "./get-daily";
