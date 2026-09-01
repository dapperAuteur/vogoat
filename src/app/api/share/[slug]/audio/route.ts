import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { share, take } from "@/db/schema";
import { getTakeAudioStore } from "@/lib/blob-store";

export const dynamic = "force-dynamic";

/** Audio for a shared page: slug is the only credential; revoked or expired = gone. */
export async function GET(_request: Request, ctx: RouteContext<"/api/share/[slug]/audio">) {
  const { slug } = await ctx.params;
  const db = await getDb();
  const rows = await db
    .select({ blobUrl: take.blobUrl, mime: take.mime, revokedAt: share.revokedAt })
    .from(share)
    .innerJoin(take, eq(take.id, share.takeId))
    .where(eq(share.slug, slug));
  const row = rows[0];
  if (!row || row.revokedAt !== null) return NextResponse.json({ ok: false, error: "not found", code: "not_found" }, { status: 404 });
  if (!row.blobUrl) return NextResponse.json({ ok: false, error: "expired", code: "gone" }, { status: 410 });
  const bytes = await getTakeAudioStore().get(row.blobUrl);
  if (!bytes) return NextResponse.json({ ok: false, error: "expired", code: "gone" }, { status: 410 });
  return new NextResponse(Buffer.from(bytes), {
    headers: { "content-type": row.mime ?? "audio/webm", "cache-control": "private, no-store", "x-robots-tag": "noindex" },
  });
}
