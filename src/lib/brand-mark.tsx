import { ImageResponse } from "next/og";

// Shared "SL" monogram used for the favicon (icon.tsx) and apple touch icon
// (apple-icon.tsx). Anton is fetched at build with a safe fallback so a font
// CDN hiccup can never break the build.

const BONE = "#F4F1EA";
const HAZARD = "#FF4A1C";

async function loadAnton(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/anton/Anton-Regular.ttf",
    );
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function brandMark(px: number) {
  const anton = await loadAnton();
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: HAZARD,
          color: BONE,
          alignItems: "center",
          justifyContent: "center",
          fontFamily: anton ? "Anton" : "sans-serif",
          letterSpacing: -2,
          textTransform: "uppercase",
        }}
      >
        <div style={{ display: "flex", fontSize: Math.round(px * 0.6), lineHeight: 1 }}>
          SL
        </div>
      </div>
    ),
    {
      width: px,
      height: px,
      fonts: anton
        ? [{ name: "Anton", data: anton, style: "normal" as const, weight: 400 as const }]
        : [],
    },
  );
}
