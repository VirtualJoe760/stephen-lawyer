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
  const body = (await req.json().catch(() => null)) as {
    placements?: { placement?: string; position?: PositionInput }[];
    // legacy single-placement shape
    placement?: string;
    position?: PositionInput;
  } | null;

  let inputs = Array.isArray(body?.placements) ? body!.placements! : [];
  if (!inputs.length && body?.placement && body?.position) inputs = [{ placement: body.placement, position: body.position }];
  const placements = inputs
    .filter((p): p is { placement: string; position: PositionInput } => Boolean(p.placement && p.position))
    .map((p) => ({ placement: p.placement, position: clamp(p.position) }));
  if (!placements.length) return Response.json({ error: "at least one placement + position required" }, { status: 400 });

  try {
    const result = await republishProductDesign(id, placements);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
