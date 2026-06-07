import { getCatalogProduct } from "@/lib/printful/client";
import { requireAdminRoute } from "@/lib/admin/auth";

type Ctx = { params: Promise<{ id: string }> };

// Distinct colors (with hex + a representative image) for a catalog product,
// used by the template node's color picker.
export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const { id } = await params;
  const pid = Number(id);
  if (!Number.isFinite(pid)) return Response.json({ error: "Invalid product id" }, { status: 400 });

  try {
    const { variants } = await getCatalogProduct(pid);
    const seen = new Map<string, { color: string; colorCode: string; image: string }>();
    for (const v of variants) {
      if (!v.color || seen.has(v.color)) continue;
      seen.set(v.color, { color: v.color, colorCode: v.color_code || "#888888", image: v.image || "" });
    }
    return Response.json({ colors: [...seen.values()] });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
