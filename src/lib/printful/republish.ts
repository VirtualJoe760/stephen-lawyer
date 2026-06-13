import { db } from "@/lib/db";
import { products, variants } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getSyncProduct,
  getCatalogVariant,
  getProductPrintfiles,
  getProductPlacements,
  createSyncProduct,
  deleteSyncProduct,
  renderMockup,
  type MockupPosition,
} from "./client";
import { uploadImage } from "@/lib/cloudinary";

const PLACEMENT_LABELS: Record<string, string> = {
  front: "Front",
  default: "Front",
  front_large: "Front (large)",
  back: "Back",
  sleeve_left: "Left sleeve",
  sleeve_right: "Right sleeve",
  left_hood: "Left hood",
  right_hood: "Right hood",
  label_inside: "Inside label",
  label_outside: "Outside label",
  outside_label: "Outside label",
};
const labelFor = (p: string, fallback?: string) => PLACEMENT_LABELS[p] ?? fallback ?? p.replace(/_/g, " ");

export interface PlacementArea {
  placement: string;
  label: string;
  areaWidth: number;
  areaHeight: number;
}
export interface ProductDesignState {
  designUrl: string;
  name: string;
  blankProductId: number;
  renderVariantId: number;
  areas: PlacementArea[]; // every print placement this product supports
  current: string[]; // placements the design currently sits on (area keys)
  placement: string; // legacy: the primary current placement
}

// Read a product's current design + the FULL set of printable placements, so the
// editor only ever offers what this product can actually print.
export async function readProductDesign(dbProductId: string): Promise<ProductDesignState | null> {
  const [p] = await db.select().from(products).where(eq(products.id, dbProductId)).limit(1);
  if (!p?.printfulSyncProductId) return null;
  const detail = await getSyncProduct(Number(p.printfulSyncProductId));
  const sv = detail.sync_variants?.[0];
  if (!sv || !sv.files?.length) return null;

  const designUrl = sv.files[0].url;
  const cv = await getCatalogVariant(sv.variant_id);
  const pf = await getProductPrintfiles(cv.product_id);
  const labels = await getProductPlacements(cv.product_id).then((r) => r.available).catch(() => ({} as Record<string, string>));

  const areas: PlacementArea[] = pf.placements.map((x) => ({
    placement: x.placement,
    label: labelFor(x.placement, labels[x.placement]),
    areaWidth: x.areaWidth,
    areaHeight: x.areaHeight,
  }));
  const areaKeys = new Set(areas.map((a) => a.placement));
  const mapKey = (t: string): string | null =>
    areaKeys.has(t) ? t : t === "default" && areaKeys.has("front") ? "front" : t === "front" && areaKeys.has("default") ? "default" : null;
  const current = [...new Set(sv.files.map((f) => mapKey(f.type)).filter(Boolean) as string[])];

  return {
    designUrl,
    name: p.name,
    blankProductId: cv.product_id,
    renderVariantId: pf.variantId ?? sv.variant_id,
    areas,
    current,
    placement: current[0] ?? areas[0]?.placement ?? "front",
  };
}

export interface PlacementInput {
  placement: string;
  position: MockupPosition;
}

// Re-publish a product with the design placed on the chosen placement(s) +
// positions: recreate the Printful sync product (proven path), re-render the
// hero mockup, delete the old one, update DB in place (slug/URL stay stable).
export async function republishProductDesign(
  dbProductId: string,
  placements: PlacementInput[],
): Promise<{ heroImageUrl: string | null }> {
  if (!placements.length) throw new Error("At least one placement is required");
  const [p] = await db.select().from(products).where(eq(products.id, dbProductId)).limit(1);
  if (!p?.printfulSyncProductId) throw new Error("Product not found");
  const oldSyncId = Number(p.printfulSyncProductId);

  const detail = await getSyncProduct(oldSyncId);
  const svs = detail.sync_variants ?? [];
  const first = svs[0];
  const file = first?.files?.[0];
  if (!first || !file) throw new Error("No print file to edit");
  const designUrl = file.url;
  const cv = await getCatalogVariant(first.variant_id);
  const blank = cv.product_id;

  const files = placements.map((pl) => ({ type: pl.placement, url: designUrl, position: pl.position }));
  const created = await createSyncProduct({
    sync_product: { name: p.name },
    sync_variants: svs.map((v) => ({ variant_id: v.variant_id, retail_price: v.retail_price, files })),
  });
  const newSyncId = created.sync_product.id;
  if (!newSyncId) throw new Error("Re-publish failed");

  // Hero mockup from the front-most placement (front/back can't share one view).
  const frontP = placements.find((pl) => pl.placement === "front" || pl.placement === "default") ?? placements[0];
  let heroUrl: string | null = null;
  try {
    const tmp = await renderMockup(blank, first.variant_id, { placement: frontP.placement, image_url: designUrl, position: frontP.position });
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
