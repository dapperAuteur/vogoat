import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { getTakeAudioStore } from "@/lib/blob-store";
import { RUNWAY_ALERT_BELOW, getRunway } from "@/lib/authoring/core";
import { dayKey } from "@/lib/game/day";
import { env, isProduction } from "@/lib/env";
import { sendEmail } from "@/lib/mailer";
import { expireTakeAudio } from "@/lib/takes/expiry";

export const dynamic = "force-dynamic";

/** Vercel cron (vercel.json) hits this daily; it sends Authorization: Bearer CRON_SECRET. */
export async function GET(request: NextRequest) {
  if (isProduction) {
    if (!env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET is not set", code: "unconfigured" }, { status: 503 });
    }
    if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ ok: false, error: "unauthorized", code: "unauthorized" }, { status: 401 });
    }
  }
  const db = await getDb();
  const result = await expireTakeAudio(db, getTakeAudioStore(), new Date());
  // Runway alert (PRD §6.5): email the admin when approved days from today drop below 7.
  const runway = await getRunway(db, dayKey(new Date(), env.DAILY_TIMEZONE));
  if (runway.consecutive < RUNWAY_ALERT_BELOW && env.ADMIN_EMAIL) {
    await sendEmail({
      to: env.ADMIN_EMAIL,
      subject: `VO GOAT runway: ${runway.consecutive} approved day${runway.consecutive === 1 ? "" : "s"} left`,
      text: `The approved-daily runway is down to ${runway.consecutive} day(s) from today (target 14, alert below ${RUNWAY_ALERT_BELOW}).\n\nOpen the console: ${env.APP_URL}/admin/dailies\nDrafts waiting: ${runway.drafts}. Auto days needing review: ${runway.autosToReview}.\n\nThe never-dark fallback keeps the game alive, but every fallback day skips your veto (PRD 6.6).`,
    });
  }
  return NextResponse.json({ ok: true, data: { ...result, runway } });
}
