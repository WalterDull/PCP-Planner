import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PCP Planner by FTC International";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          background: "linear-gradient(135deg, #123c25 0%, #1c5f39 45%, #237a49 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85 }}>
          FTC International
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 24, lineHeight: 1.1 }}>PCP Planner</div>
        <div style={{ fontSize: 34, marginTop: 28, maxWidth: 900, opacity: 0.92 }}>
          Build a CFIA-aligned Preventive Control Plan, one guided step at a time
        </div>
      </div>
    ),
    { ...size }
  );
}
