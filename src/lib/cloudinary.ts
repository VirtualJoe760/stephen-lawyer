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

/** Upload an image buffer to Cloudinary. */
export function uploadImage(
  buffer: Buffer,
  opts: { folder: string; publicId?: string },
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: "image",
        overwrite: true,
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
