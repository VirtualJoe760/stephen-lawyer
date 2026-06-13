import { db } from "@/lib/db";
import { designs, catalogues } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { auth } from "@/lib/auth";
import { generateDesign, friendlyAiError } from "@/lib/gemini";
import { uploadImage, thumbUrl } from "@/lib/cloudinary";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const catalogueId = new URL(req.url).searchParams.get("catalogueId");
  if (!catalogueId) return Response.json({ error: "catalogueId required" }, { status: 400 });

  const rows = await db
    .select()
    .from(designs)
    .where(eq(designs.catalogueId, catalogueId))
    .orderBy(desc(designs.createdAt));
  return Response.json({ designs: rows });
}

export async function POST(req: Request) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    catalogueId?: string;
    prompt?: string;
    background?: "transparent" | "filled";
    aspectRatio?: string;
  } | null;
  const catalogueId = body?.catalogueId?.trim();
  const prompt = body?.prompt?.trim();
  if (!catalogueId || !prompt) {
    return Response.json({ error: "catalogueId and prompt are required" }, { status: 400 });
  }
  const background = body?.background === "filled" ? "filled" : "transparent";
  const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : undefined;

  const [cat] = await db.select().from(catalogues).where(eq(catalogues.id, catalogueId)).limit(1);
  if (!cat) return Response.json({ error: "Catalogue not found" }, { status: 404 });

  let png: Buffer;
  try {
    png = await generateDesign(prompt, { background, aspectRatio });
  } catch (e) {
    return Response.json({ error: friendlyAiError(e) }, { status: 502 });
  }

  let uploaded;
  try {
    uploaded = await uploadImage(png, {
      folder: `stephen-lawyer/designs/${cat.slug}`,
      removeBackground: background === "transparent",
    });
  } catch (e) {
    return Response.json(
      { error: `Upload failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }

  const session = await auth();
  const createdBy = session?.user?.id;

  const [row] = await db
    .insert(designs)
    .values({
      catalogueId,
      prompt,
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
