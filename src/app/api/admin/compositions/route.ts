import { db } from "@/lib/db";
import { compositions, designs } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { getBlank } from "@/lib/printful/catalog";
import { composeOnGarment, friendlyAiError } from "@/lib/gemini";
import { uploadImage } from "@/lib/cloudinary";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    catalogueId?: string;
    designId?: string;
    templateKey?: string;
    placement?: string;
    mockupUrl?: string;
    x?: number;
    y?: number;
  } | null;

  const catalogueId = body?.catalogueId?.trim();
  const designId = body?.designId?.trim();
  const templateKey = body?.templateKey?.trim();
  if (!catalogueId || !designId || !templateKey) {
    return Response.json({ error: "catalogueId, designId, templateKey required" }, { status: 400 });
  }

  const productId = Number(templateKey);
  const blank = Number.isFinite(productId) ? await getBlank(productId) : undefined;
  if (!blank) return Response.json({ error: "Unknown product" }, { status: 400 });

  const [design] = await db.select().from(designs).where(eq(designs.id, designId)).limit(1);
  if (!design) return Response.json({ error: "Design not found" }, { status: 404 });

  const placement = body?.placement?.trim() || "front";

  // Create the row immediately so the canvas can show a skeleton.
  const [comp] = await db
    .insert(compositions)
    .values({ catalogueId, designId, templateKey, placement, status: "generating" })
    .returning();

  // Review-only composite: design graphic rendered on the garment photo.
  try {
    // Use the chosen color's mockup if the canvas sent one (validated as a
    // Printful CDN URL), else the blank's default image.
    const override =
      typeof body?.mockupUrl === "string" && body.mockupUrl.startsWith("https://files.cdn.printful.com")
        ? body.mockupUrl
        : null;
    const mockup = override || blank.image;
    if (!mockup) {
      throw new Error("No mockup image available for this blank");
    }
    const isAllOver = /dtfabric|all[_-]?over/i.test(placement);
    const instruction = isAllOver
      ? `Apply the provided graphic as a seamless all-over print covering the entire ${blank.name}. ` +
        "Realistic fabric drape, soft studio lighting, neutral background."
      : `Place the provided graphic naturally on the ${placement.replace(/_/g, " ")} of the ${blank.name}. ` +
        "Realistic fabric drape, soft studio lighting, neutral background. " +
        "The graphic must remain clearly readable and not distort.";
    const png = await composeOnGarment(design.url, mockup, instruction);
    const uploaded = await uploadImage(png, { folder: `stephen-lawyer/compositions/${comp.id}` });
    const [updated] = await db
      .update(compositions)
      .set({ previewUrl: uploaded.secureUrl, status: "draft" })
      .where(eq(compositions.id, comp.id))
      .returning();
    return Response.json({ composition: updated }, { status: 201 });
  } catch (e) {
    const msg = friendlyAiError(e);
    const [failed] = await db
      .update(compositions)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(compositions.id, comp.id))
      .returning();
    return Response.json({ composition: failed }, { status: 200 });
  }
}
