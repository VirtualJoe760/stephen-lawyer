import { db } from "@/lib/db";
import { compositions, designs } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { getTemplate } from "@/lib/printful/templates";
import { composeOnGarment } from "@/lib/gemini";
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
    x?: number;
    y?: number;
  } | null;

  const catalogueId = body?.catalogueId?.trim();
  const designId = body?.designId?.trim();
  const templateKey = body?.templateKey?.trim();
  if (!catalogueId || !designId || !templateKey) {
    return Response.json({ error: "catalogueId, designId, templateKey required" }, { status: 400 });
  }

  const tpl = getTemplate(templateKey);
  if (!tpl) return Response.json({ error: "Unknown template" }, { status: 400 });

  const [design] = await db.select().from(designs).where(eq(designs.id, designId)).limit(1);
  if (!design) return Response.json({ error: "Design not found" }, { status: 404 });

  const placement = body?.placement?.trim() || tpl.defaultPlacement;

  // Create the row immediately so the canvas can show a skeleton.
  const [comp] = await db
    .insert(compositions)
    .values({ catalogueId, designId, templateKey, placement, status: "generating" })
    .returning();

  // Review-only composite: design graphic rendered on the garment photo.
  try {
    if (!tpl.mockupUrl) {
      throw new Error("Template mockupUrl not configured — set it from the Printful catalog");
    }
    const instruction =
      `Place the provided graphic naturally on the ${placement.replace(/_/g, " ")} of the ${tpl.name}. ` +
      "Realistic fabric drape, soft studio lighting, neutral background. " +
      "The graphic must remain clearly readable and not distort.";
    const png = await composeOnGarment(design.url, tpl.mockupUrl, instruction);
    const uploaded = await uploadImage(png, { folder: `stephen-lawyer/compositions/${comp.id}` });
    const [updated] = await db
      .update(compositions)
      .set({ previewUrl: uploaded.secureUrl, status: "draft" })
      .where(eq(compositions.id, comp.id))
      .returning();
    return Response.json({ composition: updated }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const [failed] = await db
      .update(compositions)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(compositions.id, comp.id))
      .returning();
    return Response.json({ composition: failed }, { status: 200 });
  }
}
