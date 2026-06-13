import { v2 as cloudinary } from "cloudinary";

// Server-side only. Never import this from a client component — it uses the
// Cloudinary API secret.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
}

function rawUpload(buffer: Buffer, opts: { folder: string; publicId?: string }): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: "image",
        overwrite: true,
        invalidate: true,
      },
      (err, res) => {
        if (err || !res) return reject(err ?? new Error("Cloudinary upload failed"));
        resolve({
          publicId: res.public_id,
          url: res.url,
          secureUrl: res.secure_url,
          width: res.width,
          height: res.height,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Upload an image buffer to Cloudinary. When `removeBackground` is set (for
 * transparent designs), the AI background remover strips the baked-in
 * background/checkerboard Gemini produces, so the stored asset is truly
 * transparent — and every downstream URL (print file, mockup, display) inherits it.
 */
export async function uploadImage(
  buffer: Buffer,
  opts: { folder: string; publicId?: string; removeBackground?: boolean },
): Promise<UploadResult> {
  const raw = await rawUpload(buffer, opts);
  if (!opts.removeBackground) return raw;
  try {
    const url = cloudinary.url(raw.publicId, {
      secure: true,
      format: "png",
      transformation: [{ effect: "background_removal" }],
    });
    const res = await fetch(url);
    if (!res.ok) return raw; // fall back to the raw image if removal fails
    const cleaned = Buffer.from(await res.arrayBuffer());
    return await rawUpload(cleaned, { folder: opts.folder, publicId: raw.publicId });
  } catch {
    return raw;
  }
}

/**
 * Strip the background of an already-uploaded asset, overwriting it in place.
 * Returns the new Cloudinary version (used to cache-bust downstream URLs so
 * Printful re-fetches the now-transparent image instead of a cached copy).
 */
export async function removeBackgroundInPlace(publicId: string): Promise<number | null> {
  const url = cloudinary.url(publicId, {
    secure: true,
    format: "png",
    transformation: [{ effect: "background_removal" }],
  });
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const version = await new Promise<number | null>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: "image", overwrite: true, invalidate: true },
      (err, r) => (err || !r ? reject(err ?? new Error("re-upload failed")) : resolve(r.version ?? null)),
    );
    stream.end(buf);
  });
  return version;
}

/** Upscaled print URL pinned to a specific version (cache-busts Printful's fetch). */
export function versionedPrintUrl(publicId: string, version: number, width = 4500): string {
  return cloudinary.url(publicId, {
    secure: true,
    version,
    transformation: [{ width, crop: "scale" }],
  });
}

/** Square thumbnail URL (default 256px). */
export function thumbUrl(publicId: string, size = 256): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [{ width: size, height: size, crop: "fill" }],
  });
}

/**
 * Print-ready upscaled URL (default 4500px wide → ≥150 DPI on a tee front).
 *
 * Uses plain high-res scale (`c_scale`), which requires no add-on. The Cloudinary
 * AI Upscale add-on (`e_upscale`) is NOT enabled on this account (returns 400),
 * so for sharper print quality either enable that add-on and switch the
 * transform to `{ effect: "upscale", width }`, or wire Replicate Real-ESRGAN.
 */
export function upscaledPrintUrl(publicId: string, width = 4500): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [{ width, crop: "scale" }],
  });
}
