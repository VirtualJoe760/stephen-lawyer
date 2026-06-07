import { db } from "@/lib/db";
import { compositions, designs } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { renderMockup, getProductPrintfiles, type MockupPosition } from "@/lib/printful/client";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

interface PositionInput {
  areaWidth: number;
  areaHeight: number;
  width: number;
  height: number;
  top: number;
  left: number;
}

// Clamp the design rectangle so it stays fully inside the print area.
function clamp(p: PositionInput): PositionInput {
  const areaWidth = Math.max(1, Math.round(p.areaWidth));
  const areaHeight = Math.max(1, Math.round(p.areaHeight));
  let width = Math.min(Math.max(1, Math.round(p.width)), areaWidth);
  let height = Math.min(Math.max(1, Math.round(p.height)), areaHeight);
  let left = Math.round(p.left);
  let top = Math.round(p.top);
  left = Math.min(Math.max(0, left), areaWidth - width);
  top = Math.min(Math.max(0, top), areaHeight - height);
  if (width > areaWidth) width = areaWidth;
  if (height > areaHeight) height = areaHeight;
  return { areaWidth, areaHeight, width, height, top, left };
}

// Render a true Printful mockup for the chosen placement + position and save it.
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    placement?: string;
    position?: PositionInput;
  } | null;
  if (!body?.placement || !body.position) {
    return Response.json({ error: "placement and position required" }, { status: 400 });
  }

  const [comp] = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  if (!comp) return Response.json({ error: "Composition not found" }, { status: 404 });
  const [design] = await db.select().from(designs).where(eq(designs.id, comp.designId)).limit(1);
  if (!design) return Response.json({ error: "Design not found" }, { status: 404 });

  const productId = Number(comp.templateKey);
  if (!Number.isFinite(productId)) {
    return Response.json({ error: "Composition is not tied to a catalog product" }, { status: 400 });
  }

  const pos = clamp(body.position);
  const position: MockupPosition = {
    area_width: pos.areaWidth,
    area_height: pos.areaHeight,
    width: pos.width,
    height: pos.height,
    top: pos.top,
    left: pos.left,
  };

  try {
    const { variantId } = await getProductPrintfiles(productId);
    if (!variantId) return Response.json({ error: "No variant available to render" }, { status: 502 });
    const mockupUrl = await renderMockup(productId, variantId, {
      placement: body.placement,
      image_url: design.url,
      position,
    });
    const [updated] = await db
      .update(compositions)
      .set({ placement: body.placement, position: pos, previewUrl: mockupUrl, status: "draft" })
      .where(eq(compositions.id, comp.id))
      .returning();
    return Response.json({ composition: updated, mockupUrl });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
