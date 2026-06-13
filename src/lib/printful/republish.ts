import { db } from "@/lib/db";
import { products, variants } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getSyncProduct,
  getCatalogVariant,
  getProductPrintfiles,
  createSyncProduct,
  deleteSyncProduct,
  renderMockup,
  type MockupPosition,
} from "./client";
import { uploadImage } from "@/lib/cloudinary";

export interface ProductDesignState {
  placement: string;
  designUrl: string;
  areas: { placement: string; areaWidth: number; areaHeight: number }[];
  name: string;
}

// Read a product's current design + the print areas, for the editor.
export async function readProductDesign(dbProductId: string): Promise<ProductDesignState | null> {
  const [p] = await db.select().from(products).where(eq(products.id, dbProductId)).limit(1);
  if (!p?.printfulSyncProductId) return null;
  const detail = await getSyncProduct(Number(p.printfulSyncProductId));
  const sv = detail.sync_variants?.[0];
  const file = sv?.files?.[0];
  if (!sv || !file) return null;
  const cv = await getCatalogVariant(sv.variant_id);
  const pf = await getProductPrintfiles(cv.product_id);
  // Printful stores a front DTG print as type "default"; the mockup generator and
  // print areas use "front". Normalize so the editor + mockups line up.
  const placement = file.type === "default" ? "front" : file.type;
  return {
    placement,
    designUrl: file.url,
    areas: pf.placements.map((x) => ({ placement: x.placement, areaWidth: x.areaWidth, areaHeight: x.areaHeight })),
    name: p.name,
  };
}

// Re-publish a product with a new design position: recreate the Printful sync
// product (proven path), re-render the hero mockup, delete the old one, and
// update the DB rows in place (slug/URL stay stable).
export async function republishProductDesign(
  dbProductId: string,
  position: MockupPosition,
): Promise<{ heroImageUrl: string | null }> {
  const [p] = await db.select().from(products).where(eq(products.id, dbProductId)).limit(1);
  if (!p?.printfulSyncProductId) throw new Error("Product not found");
  const oldSyncId = Number(p.printfulSyncProductId);

  const detail = await getSyncProduct(oldSyncId);
  const svs = detail.sync_variants ?? [];
  const first = svs[0];
  const file = first?.files?.[0];
  if (!first || !file) throw new Error("No print file to edit");
  const placement = file.type === "default" ? "front" : file.type;
  const designUrl = file.url;
  const cv = await getCatalogVariant(first.variant_id);
  const blank = cv.product_id;

  const created = await createSyncProduct({
    sync_product: { name: p.name },
    sync_variants: svs.map((v) => ({
      variant_id: v.variant_id,
      retail_price: v.retail_price,
      files: [{ type: placement, url: designUrl, position }],
    })),
  });
  const newSyncId = created.sync_product.id;
  if (!newSyncId) throw new Error("Re-publish failed");

  let heroUrl: string | null = null;
  try {
    const tmp = await renderMockup(blank, first.variant_id, { placement, image_url: designUrl, position });
    const res = await fetch(tmp);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const up = await uploadImage(buf, { folder: "stephen-lawyer/mockups/edits", publicId: `${p.slug}-${newSyncId}` });
      heroUrl = up.secureUrl;
    }
  } catch {
    // keep the old hero if the mockup is rate-limited
  }

  await deleteSyncProduct(oldSyncId);

  await db
    .update(products)
    .set({ printfulSyncProductId: String(newSyncId), ...(heroUrl ? { heroImageUrl: heroUrl } : {}) })
    .where(eq(products.id, dbProductId));
  await db.delete(variants).where(eq(variants.productId, dbProductId));

  const newDetail = await getSyncProduct(newSyncId);
  for (const sv of newDetail.sync_variants ?? []) {
    const [color, size] = sv.name.split(" / ").slice(-2);
    await db
      .insert(variants)
      .values({
        productId: dbProductId,
        printfulSyncVariantId: String(sv.id),
        sku: sv.sku || String(sv.id),
        color: color ?? null,
        size: size ?? null,
        retailPriceCents: Math.round(Number(sv.retail_price) * 100),
        currency: sv.currency,
        inStock: sv.synced,
        imageUrl: sv.files?.find((f) => f.preview_url)?.preview_url ?? sv.product.image ?? null,
      })
      .onConflictDoNothing();
  }

  return { heroImageUrl: heroUrl };
}
