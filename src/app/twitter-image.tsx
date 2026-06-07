// Reuse the Open Graph image for Twitter/X cards (summary_large_image).
// runtime must be declared in this file directly (route segment config is not
// recognized when re-exported), so it's set here rather than pulled from ./opengraph-image.
export const runtime = "nodejs";
export { default, alt, size, contentType } from "./opengraph-image";
