import { upscaledPrintUrl } from "@/lib/cloudinary";

// The print file is the RAW design PNG, upscaled to Printful's spec
// (≥150 DPI on the print area; ~4500×5400 for tee fronts). The Nano Banana
// composite is review-only and is never sent to Printful.
//
// Cheapest path: Cloudinary `e_upscale`. If quality is insufficient, swap this
// implementation for Replicate Real-ESRGAN (TODO) — callers only need the URL.
export function upscaleForPrint(cloudinaryPublicId: string, width = 4500): string {
  return upscaledPrintUrl(cloudinaryPublicId, width);
}
