import { ImageResponse } from "next/og";
import { getDb } from "@/db/client";
import { headlineTraits } from "@/lib/game/recipe";
import { getShareView } from "@/lib/share/core";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A VO GOAT specimen card";

/** The plate as a link preview: creature name, traits, take number. No script (spoiler-free). */
export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const view = await getShareView(db, slug);
  const title = view ? view.creatureName : "VO GOAT";
  const traits = view ? headlineTraits(view.recipe).join(" · ") : "the daily voiceover game";
  const take = view ? `take ${view.takeNumber}` : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          backgroundColor: "#f7f3ea",
          color: "#0f172a",
          padding: 64,
        }}
      >
        <div style={{ fontSize: 40, letterSpacing: 6, color: "#475569" }}>VO GOAT</div>
        <div style={{ fontSize: 76, fontStyle: "italic", textAlign: "center", lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 40, color: "#3f6212" }}>{traits}</div>
        {take ? <div style={{ fontSize: 32, color: "#475569" }}>{take}</div> : null}
      </div>
    ),
    size,
  );
}
