import { GoogleGenAI, Modality } from "@google/genai";

const MODEL = "gemini-2.5-flash-image"; // Nano Banana

function client(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENAI_API_KEY not configured");
  return new GoogleGenAI({ apiKey });
}

// Minimal shape we read off the response — avoids depending on SDK internals.
interface InlinePart {
  inlineData?: { data?: string; mimeType?: string };
  text?: string;
}
interface GenResponse {
  candidates?: Array<{ content?: { parts?: InlinePart[] } }>;
}

function extractImage(res: GenResponse): Buffer {
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) return Buffer.from(data, "base64");
  }
  throw new Error("Gemini returned no image data");
}

async function fetchAsInlineData(url: string): Promise<InlinePart> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image for Gemini: ${res.status} ${url}`);
  const mimeType = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return { inlineData: { mimeType, data: buf.toString("base64") } };
}

const DESIGN_SYSTEM =
  "Generate a clothing graphic suitable for direct-to-garment printing. " +
  "Solid or transparent background. High contrast. No text unless explicitly requested. " +
  "Square aspect ratio.";

/** Generate a standalone design graphic from a text prompt. Returns PNG bytes. */
export async function generateDesign(prompt: string): Promise<Buffer> {
  const ai = client();
  const res = (await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: `${DESIGN_SYSTEM}\n\nDesign: ${prompt}` }] }],
    config: { responseModalities: [Modality.IMAGE] },
  })) as GenResponse;
  return extractImage(res);
}

/**
 * Review-only composite: render the design graphic placed on the garment photo.
 * `instruction` is the fully-built composition prompt (placement + garment type
 * already interpolated by the caller). NOT a print file. Returns PNG bytes.
 */
export async function composeOnGarment(
  designUrl: string,
  templateImageUrl: string,
  instruction: string,
): Promise<Buffer> {
  const ai = client();
  const [garment, design] = await Promise.all([
    fetchAsInlineData(templateImageUrl),
    fetchAsInlineData(designUrl),
  ]);
  const res = (await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: instruction }, garment, design] }],
    config: { responseModalities: [Modality.IMAGE] },
  })) as GenResponse;
  return extractImage(res);
}
