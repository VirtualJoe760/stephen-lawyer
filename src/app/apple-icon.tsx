import { brandMark } from "@/lib/brand-mark";

// Generated Apple touch icon — "SL" monogram on Hazard. Served at /apple-icon.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandMark(180);
}
