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
          background: "linear-gradient(135deg, #1c1c38 0%, #2a2a52 55%, #3a2a1a 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              background: "#f26a21",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 1,
            }}
          >
            FTC
          </div>
          <div style={{ fontSize: 30, letterSpacing: 3, textTransform: "uppercase", opacity: 0.9 }}>
            FTC International
          </div>
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 28, lineHeight: 1.1 }}>PCP Planner</div>
        <div style={{ fontSize: 34, marginTop: 24, maxWidth: 900, opacity: 0.92 }}>
          Build a CFIA-aligned Preventive Control Plan, one guided step at a time
        </div>
      </div>
    ),
    { ...size }
  );
}
