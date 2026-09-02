import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { practiceTake } from "@/db/schema";
import { getTakeAudioStore } from "@/lib/blob-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Owner-only playback and download of a saved practice take. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/practice-takes/[id]/audio">) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "sign in", code: "unauthenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const db = await getDb();
  const [row] = await db.select().from(practiceTake).where(and(eq(practiceTake.id, id), eq(practiceTake.userId, session.user.id)));
  if (!row || !row.blobUrl) return NextResponse.json({ ok: false, error: "not found", code: "not_found" }, { status: 404 });
  let bytes: Uint8Array | null = null;
  try {
    bytes = await getTakeAudioStore().get(row.blobUrl);
  } catch {
    return NextResponse.json({ ok: false, error: "audio storage unavailable", code: "storage_unavailable" }, { status: 503 });
  }
  if (!bytes) return NextResponse.json({ ok: false, error: "gone", code: "gone" }, { status: 410 });
  const headers: Record<string, string> = { "content-type": row.mime ?? "audio/webm", "cache-control": "private, no-store", "x-robots-tag": "noindex" };
  if (request.nextUrl.searchParams.get("download") === "1") {
    headers["content-disposition"] = `attachment; filename="vo-goat-practice-${row.recipeId}.${(row.mime ?? "webm").includes("mp4") ? "m4a" : "webm"}"`;
  }
  return new NextResponse(Buffer.from(bytes), { headers });
}
