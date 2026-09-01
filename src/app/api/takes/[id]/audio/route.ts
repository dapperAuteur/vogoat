import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { take } from "@/db/schema";
import { getTakeAudioStore } from "@/lib/blob-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Owner-only playback. Share pages get their own slug-checked route in phase 6. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/takes/[id]/audio">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "sign in", code: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [row] = await db.select().from(take).where(and(eq(take.id, id), eq(take.userId, session.user.id)));
  if (!row || !row.blobUrl) return NextResponse.json({ ok: false, error: "not found", code: "not_found" }, { status: 404 });
  const bytes = await getTakeAudioStore().get(row.blobUrl);
  if (!bytes) return NextResponse.json({ ok: false, error: "audio unavailable", code: "gone" }, { status: 410 });
  // Take downloads are a paid extra (PRD §5).
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  const plan = (session.user as { plan?: string }).plan ?? "free";
  const headers: Record<string, string> = {
    "content-type": row.mime ?? "audio/webm",
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex",
  };
  if (wantsDownload && plan !== "free") {
    const ext = (row.mime ?? "audio/webm").includes("mp4") ? "m4a" : "webm";
    headers["content-disposition"] = `attachment; filename="vo-goat-take-${row.takeNumber}.${ext}"`;
  }
  return new NextResponse(Buffer.from(bytes), { headers });
}
