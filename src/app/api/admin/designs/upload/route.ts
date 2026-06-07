import { db } from "@/lib/db";
import { designs, catalogues } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { auth } from "@/lib/auth";
import { uploadImage, thumbUrl } from "@/lib/cloudinary";
import { eq } from "drizzle-orm";

// Upload your own image as a design (stored like a generated one).
export async function POST(req: Request) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    catalogueId?: string;
    dataUrl?: string;
    name?: string;
  } | null;
  const catalogueId = body?.catalogueId?.trim();
  const dataUrl = body?.dataUrl;
  if (!catalogueId || !dataUrl) {
    return Response.json({ error: "catalogueId and dataUrl required" }, { status: 400 });
  }

  const m = /^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!m) return Response.json({ error: "Unsupported image data" }, { status: 400 });
  const buf = Buffer.from(m[3], "base64");
  if (buf.length > 10 * 1024 * 1024) {
    return Response.json({ error: "Image too large (max 10MB)" }, { status: 413 });
  }

  const [cat] = await db.select().from(catalogues).where(eq(catalogues.id, catalogueId)).limit(1);
  if (!cat) return Response.json({ error: "Catalogue not found" }, { status: 404 });

  let uploaded;
  try {
    uploaded = await uploadImage(buf, { folder: `stephen-lawyer/designs/${cat.slug}` });
  } catch (e) {
    return Response.json({ error: `Upload failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  const session = await auth();
  const createdBy = session?.user?.id;
  const [row] = await db
    .insert(designs)
    .values({
      catalogueId,
      prompt: (body?.name ?? "Uploaded image").slice(0, 200),
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
