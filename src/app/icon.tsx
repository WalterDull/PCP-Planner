import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Placeholder mark until FTC International supplies a real logo — swap this
// file out for a static public/favicon.ico + icon.png pair (Next.js's file
// convention picks those up automatically with no code change) once one
// exists.
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
          background: "#1c5f39",
          color: "white",
          fontSize: 40,
          fontWeight: 700,
          fontFamily: "sans-serif",
          borderRadius: 12,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
