import { requireAdminRoute } from "@/lib/admin/auth";
import { readProductDesign, republishProductDesign } from "@/lib/printful/republish";
import type { MockupPosition } from "@/lib/printful/client";

type Ctx = { params: Promise<{ id: string }> };

interface PositionInput {
  areaWidth: number;
  areaHeight: number;
  width: number;
  height: number;
  top: number;
  left: number;
}
function clamp(p: PositionInput): MockupPosition {
  const aw = Math.max(1, Math.round(p.areaWidth));
  const ah = Math.max(1, Math.round(p.areaHeight));
  const width = Math.min(Math.max(1, Math.round(p.width)), aw);
  const height = Math.min(Math.max(1, Math.round(p.height)), ah);
  const left = Math.min(Math.max(0, Math.round(p.left)), aw - width);
  const top = Math.min(Math.max(0, Math.round(p.top)), ah - height);
  return { area_width: aw, area_height: ah, width, height, left, top };
}

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  try {
    const state = await readProductDesign(id);
    if (!state) return Response.json({ error: "No editable design for this product" }, { status: 404 });
    return Response.json(state);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { position?: PositionInput } | null;
  if (!body?.position) return Response.json({ error: "position required" }, { status: 400 });
  try {
    const result = await republishProductDesign(id, clamp(body.position));
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
