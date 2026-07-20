import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// FTC International favicon — the orange circle mark with "FTC". To use an
// official asset instead, drop a static public/favicon.ico (Next.js's file
// convention picks it up automatically) and delete this file.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f26a21",
          color: "white",
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 0.5,
          fontFamily: "sans-serif",
          borderRadius: 999,
        }}
      >
        FTC
      </div>
    ),
    { ...size }
  );
}
