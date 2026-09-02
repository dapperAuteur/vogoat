import { ImageResponse } from "next/og";
import { getDb } from "@/db/client";
import { getArchiveDay } from "@/lib/archive";
import { dayKey } from "@/lib/game/day";
import { headlineTraits } from "@/lib/game/recipe";
import { env } from "@/lib/env";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A VO GOAT specimen";

export default async function OgImage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const db = await getDb();
  const day = await getArchiveDay(db, date, dayKey(new Date(), env.DAILY_TIMEZONE), env.LAUNCH_DATE);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20, backgroundColor: "#f7f3ea", color: "#0f172a", padding: 64 }}>
        <div style={{ fontSize: 34, letterSpacing: 6, color: "#475569" }}>VO GOAT {day ? `No. ${day.dayNumber}` : ""}</div>
        <div style={{ fontSize: 68, fontStyle: "italic", textAlign: "center", lineHeight: 1.1 }}>{day ? day.creatureName : "The daily voiceover game"}</div>
        {day ? <div style={{ fontSize: 36, color: "#3f6212" }}>{headlineTraits(day.recipe).join(" · ")}</div> : null}
      </div>
    ),
    size,
  );
}
