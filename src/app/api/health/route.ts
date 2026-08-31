import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { dbDriver, getDb } from "@/db/client";

export const dynamic = "force-dynamic";

/** Liveness + database reachability. Envelope per the shared conventions. */
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, data: { db: dbDriver(), time: new Date().toISOString() } });
  } catch (error: unknown) {
    console.error("[health] database unreachable:", error instanceof Error ? error.constructor.name : "unknown");
    return NextResponse.json({ ok: false, error: "database unreachable", code: "db_unreachable" }, { status: 503 });
  }
}
