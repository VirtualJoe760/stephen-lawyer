import { GoogleGenAI, Modality } from "@google/genai";

const MODEL = "gemini-2.5-flash-image"; // Nano Banana

function client(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY not configured");
  return new GoogleGenAI({ apiKey });
}

interface InlinePart {
  inlineData?: { data?: string; mimeType?: string };
  text?: string;
}
interface GenResponse {
  candidates?: Array<{ content?: { parts?: InlinePart[] } }>;
}

/** Maps raw Gemini errors to a short, user-facing message. */
export function friendlyAiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/RESOURCE_EXHAUSTED|quota|\b429\b/i.test(msg)) {
    return "Image generation is over quota — the Gemini image model needs billing enabled on the API key's Google Cloud project.";
  }
  if (/API[_ ]?key|PERMISSION_DENIED|UNAUTHENT|\b401\b|\b403\b/i.test(msg)) {
    return "Gemini API key is missing or unauthorized for this project.";
  }
  if (/NOT_FOUND|\b404\b/i.test(msg)) {
    return "Gemini model not available for this key/project.";
  }
  if (/no image data/i.test(msg)) {
    return "The model didn't return an image (it can happen on a prompt it won't render). Try again or tweak the prompt.";
  }
  return msg;
}

async function fetchAsInlineData(url: string): Promise<InlinePart> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for Gemini: ${res.status} ${url}`);
  const mimeType = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return { inlineData: { mimeType, data: buf.toString("base64") } };
}

// Quota/auth/model errors won't be fixed by retrying.
function isPermanent(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /RESOURCE_EXHAUSTED|quota|\b429\b|PERMISSION_DENIED|UNAUTHENT|\b401\b|\b403\b|NOT_FOUND|\b404\b/i.test(m);
}

// Generate an image, retrying transient empty responses (Nano Banana sometimes
// returns text/safety with no inlineData). Does not retry permanent errors.
async function generateImage(parts: InlinePart[], attempts = 3): Promise<Buffer> {
  const ai = client();
  let lastErr: unknown = new Error("Gemini returned no image data");
  for (let i = 0; i < attempts; i++) {
    try {
      const res = (await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: { responseModalities: [Modality.IMAGE] },
      })) as GenResponse;
      for (const p of res.candidates?.[0]?.content?.parts ?? []) {
        if (p.inlineData?.data) return Buffer.from(p.inlineData.data, "base64");
      }
      lastErr = new Error("Gemini returned no image data");
    } catch (e) {
      lastErr = e;
      if (isPermanent(e)) throw e;
    }
  }
  throw lastErr;
}

export interface DesignOptions {
  background?: "transparent" | "filled";
  aspectRatio?: string; // e.g. "1:1", "4:5", "16:9" — only meaningful when filled
}

const ALLOWED_RATIOS = new Set(["1:1", "4:5", "3:4", "2:3", "3:2", "16:9", "9:16"]);

function designSystem(opts?: DesignOptions): string {
  if (opts?.background === "filled") {
    const ar = opts.aspectRatio && ALLOWED_RATIOS.has(opts.aspectRatio) ? opts.aspectRatio : "1:1";
    return (
      "Generate finished graphic art with a complete background that fills the entire frame edge to edge " +
      `(no transparency). Compose it in a ${ar} aspect ratio. High contrast, bold, print-ready.`
    );
  }
  return (
    "Generate a clothing graphic suitable for direct-to-garment printing. " +
    "Fully transparent background — PNG alpha, no backdrop, no white box behind the art. " +
    "High contrast. No text unless explicitly requested. Square aspect ratio."
  );
}

/** Generate a standalone design graphic from a text prompt. Returns PNG bytes. */
export async function generateDesign(prompt: string, opts?: DesignOptions): Promise<Buffer> {
  return generateImage([{ text: `${designSystem(opts)}\n\nDesign: ${prompt}` }]);
}

/** Merge two design graphics into one, guided by a "how should they collide" prompt. */
export async function mergeDesigns(urlA: string, urlB: string, prompt: string): Promise<Buffer> {
  const [a, b] = await Promise.all([fetchAsInlineData(urlA), fetchAsInlineData(urlB)]);
  const instruction =
    `Combine these two graphics into a single cohesive clothing design. ${prompt}. ` +
    "Solid or transparent background, high contrast, square aspect ratio, suitable for direct-to-garment printing.";
  return generateImage([{ text: instruction }, a, b]);
}

/**
 * Review-only composite: design graphic rendered on the garment photo.
 * `instruction` is the fully-built composition prompt. NOT a print file.
 */
export async function composeOnGarment(
  designUrl: string,
  templateImageUrl: string,
  instruction: string,
): Promise<Buffer> {
  const [garment, design] = await Promise.all([
    fetchAsInlineData(templateImageUrl),
    fetchAsInlineData(designUrl),
  ]);
  return generateImage([{ text: instruction }, garment, design]);
}
