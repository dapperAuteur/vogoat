import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { getTakeAudioStore } from "@/lib/blob-store";
import { env, isProduction } from "@/lib/env";
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
  return NextResponse.json({ ok: true, data: result });
}
