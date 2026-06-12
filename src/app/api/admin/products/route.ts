import { db } from "@/lib/db";
import { products, variants } from "@/db/schema";
import { requireAdminRoute } from "@/lib/admin/auth";
import { desc, inArray } from "drizzle-orm";

// All products (published + paused) for the admin product manager.
export async function GET() {
  const denied = await requireAdminRoute();
  if (denied) return denied;

  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  const ids = rows.map((r) => r.id);
  const vs = ids.length ? await db.select().from(variants).where(inArray(variants.productId, ids)) : [];

  const byProduct = new Map<string, typeof vs>();
  for (const v of vs) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }

  const list = rows.map((p) => {
    const pv = byProduct.get(p.id) ?? [];
    const prices = pv.map((v) => v.retailPriceCents).filter((n) => n > 0);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      isPublished: p.isPublished,
      printfulSyncProductId: p.printfulSyncProductId,
      image: p.heroImageUrl ?? pv.find((v) => v.imageUrl)?.imageUrl ?? null,
      priceCents: prices.length ? Math.min(...prices) : 0,
      variantCount: pv.length,
    };
  });
  return Response.json({ products: list });
}
