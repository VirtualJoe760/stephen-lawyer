import { brandMark } from "@/lib/brand-mark";

// Generated favicon — "SL" monogram on Hazard. Served at /icon.
export const runtime = "nodejs";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return brandMark(512);
}
