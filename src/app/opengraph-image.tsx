import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VO GOAT, the daily voiceover game";

export default function OgImage() {
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
          gap: 20,
          backgroundColor: "#f7f3ea",
          color: "#0f172a",
        }}
      >
        <div style={{ fontSize: 110, fontStyle: "italic", letterSpacing: 10 }}>VO GOAT</div>
        <div style={{ fontSize: 42, color: "#3f6212" }}>The daily voiceover game</div>
        <div style={{ fontSize: 30, color: "#475569" }}>
          One shared recipe a day · record your best take · collect the creature
        </div>
      </div>
    ),
    size,
  );
}
