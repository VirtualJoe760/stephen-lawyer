import { db } from "@/lib/db";
import { products, variants } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { listSyncProducts, getSyncProduct } from "@/lib/printful/client";
import { slugify } from "@/lib/utils";

const CATEGORY_HINTS: Record<string, "tees" | "hoodies" | "hats" | "accessories"> = {
  tee: "tees",
  "t-shirt": "tees",
  hoodie: "hoodies",
  pullover: "hoodies",
  hat: "hats",
  cap: "hats",
  beanie: "hats",
};

function inferCategory(name: string): "tees" | "hoodies" | "hats" | "accessories" {
  const lower = name.toLowerCase();
  for (const [hint, cat] of Object.entries(CATEGORY_HINTS)) {
    if (lower.includes(hint)) return cat;
  }
  return "accessories";
}

export interface SyncSummary {
  productsSeen: number;
  productsUpserted: number;
  variantsUpserted: number;
  errors: string[];
}

export async function syncPrintfulCatalog(): Promise<SyncSummary> {
  if (!process.env.PRINTFUL_API_KEY) throw new Error("PRINTFUL_API_KEY not set");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const summary: SyncSummary = { productsSeen: 0, productsUpserted: 0, variantsUpserted: 0, errors: [] };
  const list = await listSyncProducts();

  for (const sp of list) {
    summary.productsSeen++;
    if (sp.is_ignored) continue;
    try {
      const detail = await getSyncProduct(sp.id);
      const baseSlug = slugify(detail.sync_product.name);
      const slug = `${baseSlug}-${sp.id}`;

      const [productRow] = await db
        .insert(products)
        .values({
          printfulSyncProductId: String(sp.id),
          slug,
          name: detail.sync_product.name,
          category: inferCategory(detail.sync_product.name),
        })
        .onConflictDoUpdate({
          target: products.printfulSyncProductId,
          set: {
            name: detail.sync_product.name,
            slug,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: products.id });

      if (!productRow) continue;
      summary.productsUpserted++;

      for (const sv of detail.sync_variants) {
        const [color, size] = sv.name.split(" / ").slice(-2);
        await db
          .insert(variants)
          .values({
            productId: productRow.id,
            printfulSyncVariantId: String(sv.id),
            sku: sv.sku,
            color: color ?? null,
            size: size ?? null,
            retailPriceCents: Math.round(Number(sv.retail_price) * 100),
            currency: sv.currency,
            inStock: sv.synced,
            imageUrl: sv.product.image ?? sv.files?.[0]?.preview_url ?? null,
          })
          .onConflictDoUpdate({
            target: variants.printfulSyncVariantId,
            set: {
              sku: sv.sku,
              color: color ?? null,
              size: size ?? null,
              retailPriceCents: Math.round(Number(sv.retail_price) * 100),
              currency: sv.currency,
              inStock: sv.synced,
              imageUrl: sv.product.image ?? sv.files?.[0]?.preview_url ?? null,
            },
          });
        summary.variantsUpserted++;
      }
    } catch (err) {
      summary.errors.push(`sync product ${sp.id}: ${String(err)}`);
    }
  }

  return summary;
}
