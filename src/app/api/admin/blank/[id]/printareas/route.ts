import { getProductPrintfiles, getProductPlacements } from "@/lib/printful/client";
import { requireAdminRoute } from "@/lib/admin/auth";

type Ctx = { params: Promise<{ id: string }> };

// Print-area dimensions per placement (the coordinate space for positioning),
// plus human labels and a variant id to render mockups with.
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { id } = await params;
  const pid = Number(id);
  if (!Number.isFinite(pid)) return Response.json({ error: "Invalid product id" }, { status: 400 });

  try {
    const [{ variantId, placements }, labels] = await Promise.all([
      getProductPrintfiles(pid),
      getProductPlacements(pid).catch(() => ({ available: {} as Record<string, string> })),
    ]);
    // Drop all-over (dye-on-fabric) placements — those aren't position-editable.
    const editable = placements
      .filter((p) => !/dtfabric|all[_-]?over/i.test(p.placement))
      .map((p) => ({ ...p, label: labels.available[p.placement] ?? p.placement.replace(/_/g, " ") }));
    return Response.json({ variantId, placements: editable });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
