/**
 * All-Over Print (sublimation) prototype: true full-garment tri-color camo on
 * an AOP tee and the warmup hoodie. Fills every panel (front/back/sleeves/hood)
 * with a seamless camo pattern — real all-over camo, not a DTG patch.
 *
 *   npx tsx --env-file=.env.local scripts/aop-drop.ts
 */
import { db } from "../src/lib/db";
import { catalogues, designs, products } from "../src/db/schema";
import { and, eq } from "drizzle-orm";
import { generateDesign } from "../src/lib/gemini";
import { uploadImage, thumbUrl } from "../src/lib/cloudinary";
import { upscaleForPrint } from "../src/lib/printful/upscale";
import {
  getCatalogProduct,
  getProductPrintfiles,
  createSyncProduct,
  listSyncProducts,
  deleteSyncProduct,
  renderMockup,
  type MockupPosition,
} from "../src/lib/printful/client";
import { syncPrintfulCatalog } from "../src/lib/printful/sync";

const CATALOGUE = { name: "Stephen Lawyer — Drop 1", slug: "stephen-lawyer-drop-1" };

const CAMO = {
  key: "aop-tricolor-camo",
  prompt:
    "A seamless all-over tri-color camouflage pattern in cream, hazard-orange and charcoal-black, hand-painted organic brushy blobs, evenly distributed, repeating edge to edge, bold and graphic. No logos, no text, full bleed.",
};

interface AopProduct {
  slug: string;
  name: string;
  blank: number;
  front: string; // front-panel placement (for the hero mockup)
  category: "tees" | "hoodies";
  priceCents: number;
  description: string;
}
const PRODUCTS: AopProduct[] = [
  { slug: "tricolor-camo-aop-tee", name: "TRI-COLOR CAMO AOP TEE", blank: 257, front: "default", category: "tees", priceCents: 5200, description: "True all-over tri-color camo — sublimated edge to edge, front, back and sleeves. His signature pattern, done right." },
  { slug: "tricolor-camo-warmup-hoodie", name: "TRI-COLOR CAMO WARMUP HOODIE", blank: 919, front: "front", category: "hoodies", priceCents: 9800, description: "All-over tri-color camo warmup hoodie — sublimated across every panel, hood included." },
];

const full = (aw: number, ah: number): MockupPosition => ({ area_width: aw, area_height: ah, width: aw, height: ah, top: 0, left: 0 });

async function ensureCamo(catalogueId: string): Promise<{ publicId: string; url: string }> {
  const label = `Drop1 — ${CAMO.key}`;
  const [existing] = await db.select().from(designs).where(and(eq(designs.catalogueId, catalogueId), eq(designs.prompt, label))).limit(1);
  if (existing) { console.log("· reuse camo design"); return { publicId: existing.cloudinaryPublicId, url: existing.url }; }
  console.log("· generating seamless camo…");
  const png = await generateDesign(CAMO.prompt, { background: "filled", aspectRatio: "4:5" });
  const up = await uploadImage(png, { folder: `stephen-lawyer/designs/${CATALOGUE.slug}` });
  await db.insert(designs).values({ catalogueId, prompt: label, cloudinaryPublicId: up.publicId, url: up.secureUrl, thumbUrl: thumbUrl(up.publicId, 256) });
  return { publicId: up.publicId, url: up.secureUrl };
}

async function renderHero(blank: number, variantId: number, placement: string, designUrl: string, position: MockupPosition, slug: string): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const tmp = await renderMockup(blank, variantId, { placement, image_url: designUrl, position });
      const res = await fetch(tmp);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const up = await uploadImage(buf, { folder: "stephen-lawyer/mockups/aop", publicId: slug });
      return up.secureUrl;
    } catch (e) {
      const m = /try again after (\d+) second/i.exec(e instanceof Error ? e.message : String(e));
      if (m && attempt < 5) { const w = Number(m[1]) + 4; console.log(`    · rate-limited ${w}s…`); await new Promise((r) => setTimeout(r, w * 1000)); continue; }
      console.log(`    ! mockup failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  return null;
}

async function main() {
  const [cat] = await db.select().from(catalogues).where(eq(catalogues.slug, CATALOGUE.slug)).limit(1);
  if (!cat) throw new Error("catalogue not found");
  const camo = await ensureCamo(cat.id);
  const printUrl = upscaleForPrint(camo.publicId, 4500);

  // Clean-replace by name.
  const names = new Set(PRODUCTS.map((p) => p.name));
  for (const sp of await listSyncProducts(100)) {
    if (names.has(sp.name)) {
      try { await deleteSyncProduct(sp.id); await db.delete(products).where(eq(products.printfulSyncProductId, String(sp.id))); console.log(`~ removed prior ${sp.name}`); } catch {}
    }
  }

  const published: { syncId: string; p: AopProduct; hero: string | null }[] = [];
  for (const p of PRODUCTS) {
    console.log(`\n▶ ${p.name}`);
    const { variants } = await getCatalogProduct(p.blank);
    const pf = await getProductPrintfiles(p.blank);
    const areaByPlacement = new Map(pf.placements.map((x) => [x.placement, x]));
    // Fill every panel with the camo (true all-over).
    const files = pf.placements.map((x) => ({ type: x.placement, url: printUrl, position: full(x.areaWidth, x.areaHeight) }));
    try {
      const synced = await createSyncProduct({
        sync_product: { name: p.name, external_id: p.slug },
        sync_variants: variants.map((v) => ({ variant_id: v.id, retail_price: (p.priceCents / 100).toFixed(2), files })),
      });
      const syncId = String(synced.sync_product?.id ?? "");
      console.log(`  ✓ published #${syncId} (${variants.length} variants, ${files.length} panels)`);
      const fa = areaByPlacement.get(p.front) ?? pf.placements[0];
      const hero = syncId ? await renderHero(p.blank, pf.variantId ?? variants[0].id, p.front, camo.url, full(fa.areaWidth, fa.areaHeight), p.slug) : null;
      console.log(`    mockup: ${hero ? "ok" : "(fell back)"}`);
      if (syncId) published.push({ syncId, p, hero });
    } catch (e) {
      console.log(`  ✗ publish failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\nSyncing → DB…`);
  const s = await syncPrintfulCatalog();
  console.log(`  upserted ${s.productsUpserted} products, ${s.variantsUpserted} variants, errors ${s.errors.length}`);
  for (const { syncId, p, hero } of published) {
    await db.update(products).set({ isPublished: true, descriptionMd: p.description, category: p.category, ...(hero ? { heroImageUrl: hero } : {}) }).where(eq(products.printfulSyncProductId, syncId));
  }
  console.log(`\nDone. Published ${published.length} AOP products.`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
