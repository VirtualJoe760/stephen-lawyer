import { db } from "@/lib/db";
import { designs, catalogues } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { auth } from "@/lib/auth";
import { mergeDesigns, friendlyAiError } from "@/lib/gemini";
import { uploadImage, thumbUrl } from "@/lib/cloudinary";
import { eq } from "drizzle-orm";

// Merge two existing designs into a new one via Gemini, guided by a prompt.
export async function POST(req: Request) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    catalogueId?: string;
    designAId?: string;
    designBId?: string;
    prompt?: string;
  } | null;
  const catalogueId = body?.catalogueId?.trim();
  const designAId = body?.designAId?.trim();
  const designBId = body?.designBId?.trim();
  const prompt = (body?.prompt ?? "").trim() || "Blend them naturally into one graphic";
  if (!catalogueId || !designAId || !designBId) {
    return Response.json({ error: "catalogueId, designAId, designBId required" }, { status: 400 });
  }

  const [cat] = await db.select().from(catalogues).where(eq(catalogues.id, catalogueId)).limit(1);
  if (!cat) return Response.json({ error: "Catalogue not found" }, { status: 404 });
  const [a] = await db.select().from(designs).where(eq(designs.id, designAId)).limit(1);
  const [b] = await db.select().from(designs).where(eq(designs.id, designBId)).limit(1);
  if (!a || !b) return Response.json({ error: "Design not found" }, { status: 404 });

  let png: Buffer;
  try {
    png = await mergeDesigns(a.url, b.url, prompt);
  } catch (e) {
    return Response.json({ error: friendlyAiError(e) }, { status: 502 });
  }

  const uploaded = await uploadImage(png, { folder: `stephen-lawyer/designs/${cat.slug}` });
  const session = await auth();
  const createdBy = session?.user?.id;
  const [row] = await db
    .insert(designs)
    .values({
      catalogueId,
      prompt: `Merge — ${prompt}`,
      cloudinaryPublicId: uploaded.publicId,
      url: uploaded.secureUrl,
      thumbUrl: thumbUrl(uploaded.publicId, 256),
      ...(createdBy ? { createdBy } : {}),
    })
    .returning();

  return Response.json(
    { design: { id: row.id, url: row.url, thumbUrl: row.thumbUrl, prompt: row.prompt } },
    { status: 201 },
  );
}
