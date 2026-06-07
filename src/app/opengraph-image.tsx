import { ImageResponse } from "next/og";

// Branded Open Graph image for social shares. File-based metadata convention:
// Next.js automatically wires this into openGraph.images for every route that
// doesn't override it. See twitter-image.tsx (re-exports this).

export const runtime = "nodejs";
export const alt = "STEPHEN LAWYER — direct-to-consumer apparel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand palette (src/app/globals.css)
const INK = "#0F0F0F";
const BONE = "#F4F1EA";
const HAZARD = "#FF4A1C";
const ACID = "#C8FF3F";

// Anton is the display wordmark font (also used via next/font in layout.tsx).
// Fetched at build time from a stable CDN mirror of google/fonts. If the fetch
// fails for any reason we fall back to the default font so the build never breaks.
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

export default async function OpengraphImage() {
  const anton = await loadAnton();
  const fontFamily = anton ? "Anton" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: INK,
          color: BONE,
          padding: 80,
          justifyContent: "space-between",
          fontFamily,
          // dot-grid texture to echo the site's background motif
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(244,241,234,0.10) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      >
        {/* eyebrow tab */}
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              background: HAZARD,
              color: BONE,
              fontSize: 30,
              letterSpacing: 3,
              padding: "10px 22px",
              textTransform: "uppercase",
            }}
          >
            Direct-to-consumer apparel
          </div>
        </div>

        {/* wordmark, set tight on two lines */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 0.84,
            letterSpacing: -3,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", fontSize: 248 }}>Stephen</div>
          <div style={{ display: "flex", fontSize: 248 }}>
            Lawyer<span style={{ color: HAZARD }}>.</span>
          </div>
        </div>

        {/* footer row: domain + accent block */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", fontSize: 32, letterSpacing: 2, opacity: 0.75 }}>
            stephenlawyer.clothing
          </div>
          <div style={{ display: "flex", height: 18, width: 180, background: ACID }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: anton
        ? [{ name: "Anton", data: anton, style: "normal" as const, weight: 400 as const }]
        : [],
    },
  );
}
