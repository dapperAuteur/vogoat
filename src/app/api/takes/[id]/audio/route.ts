import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { take } from "@/db/schema";
import { EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/server";
import { getTakeAudioStore } from "@/lib/blob-store";
import { logAppError } from "@/lib/errors/log";
import { getSession, type SessionUser } from "@/lib/session";
import { audioFileExtension } from "@/lib/takes/audio-format";
import { canDownloadTake, hasPaidPerks } from "@/lib/takes/download-policy";

export const dynamic = "force-dynamic";

/** Owner-only playback. Share pages get their own slug-checked route in phase 6. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/takes/[id]/audio">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "sign in", code: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [row] = await db.select().from(take).where(and(eq(take.id, id), eq(take.userId, session.user.id)));
  if (!row || !row.blobUrl) return NextResponse.json({ ok: false, error: "not found", code: "not_found" }, { status: 404 });
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  if (wantsDownload && !canDownloadTake({ user: session.user as SessionUser, takeCreatedAt: row.createdAt })) {
    return NextResponse.json(
      { ok: false, error: "Free plans can download a take within 24 hours of recording it. Upgrade to download any time.", code: "download_window_closed" },
      { status: 403 },
    );
  }
  let bytes: Uint8Array | null = null;
  try {
    bytes = await getTakeAudioStore().get(row.blobUrl);
  } catch (error: unknown) {
    await logAppError(db, { source: "server", message: `store.get: ${error instanceof Error ? error.message : "unknown"}`, path: "/api/takes/[id]/audio" });
    return NextResponse.json({ ok: false, error: "audio storage unavailable", code: "storage_unavailable" }, { status: 503 });
  }
  if (!bytes) return NextResponse.json({ ok: false, error: "audio unavailable", code: "gone" }, { status: 410 });
  // Downloads: free plans within 24 hours of recording, paid plans and admin any time (checked above).
  const headers: Record<string, string> = {
    "content-type": row.mime ?? "audio/webm",
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex",
  };
  if (wantsDownload) {
    trackServerEvent(EVENTS.takeDownloaded, { kind: "daily", paid: hasPaidPerks(session.user as SessionUser) });
    headers["content-disposition"] = `attachment; filename="vo-goat-take-${row.takeNumber}.${audioFileExtension(row.mime)}"`;
  }
  return new NextResponse(Buffer.from(bytes), { headers });
}
