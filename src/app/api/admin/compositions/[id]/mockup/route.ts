import { db } from "@/lib/db";
import { compositions, designs } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { renderMockups, getProductPrintfiles, type MockupPosition, type MockupFile } from "@/lib/printful/client";
import { eq, inArray } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

interface PositionInput {
  areaWidth: number;
  areaHeight: number;
  width: number;
  height: number;
  top: number;
  left: number;
}
interface PlacementInput {
  placement: string;
  designId: string;
  position: PositionInput | null;
}

// Clamp the design rectangle so it stays fully inside the print area.
function clamp(p: PositionInput): PositionInput {
  const areaWidth = Math.max(1, Math.round(p.areaWidth));
  const areaHeight = Math.max(1, Math.round(p.areaHeight));
  const width = Math.min(Math.max(1, Math.round(p.width)), areaWidth);
  const height = Math.min(Math.max(1, Math.round(p.height)), areaHeight);
  const left = Math.min(Math.max(0, Math.round(p.left)), areaWidth - width);
  const top = Math.min(Math.max(0, Math.round(p.top)), areaHeight - height);
  return { areaWidth, areaHeight, width, height, top, left };
}
const toPF = (p: PositionInput): MockupPosition => ({
  area_width: p.areaWidth,
  area_height: p.areaHeight,
  width: p.width,
  height: p.height,
  top: p.top,
  left: p.left,
});

// Render a true Printful mockup for one or more placements and save it.
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as {
    placements?: PlacementInput[];
    // legacy single-placement shape
    placement?: string;
    position?: PositionInput;
    designId?: string;
  } | null;

  const [comp] = await db.select().from(compositions).where(eq(compositions.id, id)).limit(1);
  if (!comp) return Response.json({ error: "Composition not found" }, { status: 404 });

  // Normalise to a placements array (back-compat with the single-placement call).
  let inputs: PlacementInput[] = [];
  if (Array.isArray(body?.placements) && body.placements.length) {
    inputs = body.placements;
  } else if (body?.placement && body.position) {
    inputs = [{ placement: body.placement, designId: body.designId || comp.designId, position: body.position }];
  }
  inputs = inputs.filter((p) => p.placement && p.designId && p.position);
  if (!inputs.length) return Response.json({ error: "At least one placement with a position is required" }, { status: 400 });

  const productId = Number(comp.templateKey);
  if (!Number.isFinite(productId)) {
    return Response.json({ error: "Composition is not tied to a catalog product" }, { status: 400 });
  }

  // Resolve design image URLs.
  const designIds = [...new Set(inputs.map((p) => p.designId))];
  const designRows = await db.select().from(designs).where(inArray(designs.id, designIds));
  const urlById = new Map(designRows.map((d) => [d.id, d.url]));
  if (designIds.some((d) => !urlById.has(d))) {
    return Response.json({ error: "A referenced design was not found" }, { status: 404 });
  }

  const clamped = inputs.map((p) => ({ ...p, position: clamp(p.position!) }));
  const files: MockupFile[] = clamped.map((p) => ({
    placement: p.placement,
    image_url: urlById.get(p.designId)!,
    position: toPF(p.position),
  }));

  try {
    const { variantId } = await getProductPrintfiles(productId);
    if (!variantId) return Response.json({ error: "No variant available to render" }, { status: 502 });
    const mockups = await renderMockups(productId, variantId, files);
    // Primary preview: front if present, else the first rendered placement.
    const previewUrl = mockups.front ?? Object.values(mockups)[0] ?? comp.previewUrl;
    const placementsToSave = clamped.map((p) => ({ placement: p.placement, designId: p.designId, position: p.position }));
    const [updated] = await db
      .update(compositions)
      .set({
        placements: placementsToSave,
        placement: placementsToSave[0].placement,
        designId: placementsToSave[0].designId,
        position: placementsToSave[0].position,
        previewUrl,
        status: "draft",
      })
      .where(eq(compositions.id, comp.id))
      .returning();
    return Response.json({ composition: updated, mockups, previewUrl });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
