import { getProductPlacements } from "@/lib/printful/client";
import { requireAdminRoute } from "@/lib/admin/auth";

type Ctx = { params: Promise<{ id: string }> };

// Available print placements for a catalog product (front/back/sleeves/labels/
// embroidery, plus all-over), used by the Combine dialog.
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { id } = await params;
  const pid = Number(id);
  if (!Number.isFinite(pid)) return Response.json({ error: "Invalid product id" }, { status: 400 });

  try {
    const placements = await getProductPlacements(pid);
    return Response.json(placements);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
