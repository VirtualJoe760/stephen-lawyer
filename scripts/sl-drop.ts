/**
 * Stephen Lawyer — Drop 1 product generator.
 *
 * Premeditated, life-inspired line (Encinitas coast / tri-color camo / classical
 * guitar / garden-leaf / skate brotherhood). Generates each design via Gemini,
 * uploads to Cloudinary, and publishes a real Printful sync product, then mirrors
 * into the products/variants tables (isPublished + description + category).
 *
 * Run a slice first to verify:   npx tsx --env-file=.env.local scripts/sl-drop.ts 4
 * Run everything:                npx tsx --env-file=.env.local scripts/sl-drop.ts all
 *
 * Idempotent: re-uses an existing design with the same prompt, and uses the slug
 * as the Printful idempotency key so re-runs don't duplicate products.
 */
import { db } from "../src/lib/db";
import { catalogues, designs, products } from "../src/db/schema";
import { and, eq } from "drizzle-orm";
import { generateDesign } from "../src/lib/gemini";
import { uploadImage, thumbUrl } from "../src/lib/cloudinary";
import { upscaleForPrint } from "../src/lib/printful/upscale";
import { getCatalogProduct, createSyncProduct, listSyncProducts, deleteSyncProduct, renderMockup, getProductPrintfiles, type MockupPosition } from "../src/lib/printful/client";
import { syncPrintfulCatalog } from "../src/lib/printful/sync";

const CATALOGUE = { name: "Stephen Lawyer — Drop 1", slug: "stephen-lawyer-drop-1" };

type Cat = "tees" | "hoodies" | "hats" | "accessories";
const BLANK = { tee: 71, hoodie: 146, crew: 145, tote: 641 };

interface Design {
  key: string;
  prompt: string;
  background: "transparent" | "filled";
  aspectRatio?: string;
}
interface Product {
  slug: string;
  name: string;
  design: string; // Design.key
  blank: number;
  category: Cat;
  placement: "front" | "back";
  priceCents: number;
  colors: string[]; // preferred color names (falls back to first 2)
  description: string;
}

// ---- Designs (unique graphics) -------------------------------------------------
const D: Design[] = [
  { key: "coast-sunset", background: "filled", aspectRatio: "4:5", prompt:
    "A hand-screenprinted-style North County San Diego coastline at dusk: silhouetted palms and a low Pacific sunset over Highway 101, marine-layer haze, grainy 3-color riso print look in burnt orange, cream and deep teal. Bold, nostalgic, surf-skate zine aesthetic." },
  { key: "encinitas-arch", background: "transparent", prompt:
    "Bold vintage athletic arch wordmark reading 'ENCINITAS' over '92024', distressed letterpress texture, single cream ink, collegiate-meets-skate, transparent background, centered, high contrast." },
  { key: "tricolor-camo", background: "filled", aspectRatio: "1:1", prompt:
    "An original tri-color camouflage pattern in cream, hazard-orange and charcoal, hand-painted brushy blobs, slightly psychedelic, seamless all-over feel, bold and graphic. No logos or text." },
  { key: "lawyer-camo-word", background: "transparent", prompt:
    "The single word 'LAWYER' in a heavy condensed gothic typeface, the letterforms filled with tri-color camo (cream, orange, charcoal), thick black outline, transparent background, centered, high contrast." },
  { key: "nylon-guitar", background: "transparent", prompt:
    "Detailed single-line / fine-line tattoo-style drawing of a classical nylon-string acoustic guitar with flowing sound waves and a few falling leaves, monoline cream ink, transparent background, centered, elegant and raw." },
  { key: "deck-guitar", background: "transparent", prompt:
    "A skateboard deck and a classical guitar neck fused into one object, hand-drawn etching style, cross-hatching, monochrome cream line art on transparent background, surreal but clean, centered." },
  { key: "garden-leaf", background: "filled", aspectRatio: "4:5", prompt:
    "A lush psychedelic botanical illustration: overlapping cannabis and tropical leaves with swirling 70s-poster linework, sunburst behind, warm earthy palette of olive, gold and rust, vintage garden-poster vibe. No text." },
  { key: "small-leaf", background: "transparent", prompt:
    "A small, clean single botanical leaf emblem with a fine sun-ray halo, two-color cream-and-olive line art, transparent background, centered, simple and tasteful like an embroidered patch." },
  { key: "griptape", background: "transparent", prompt:
    "Distressed grip-tape texture rectangle with hand-scratched scrawl reading 'KEEP PUSHING', raw DIY skate-sticker look, black and cream, scuffed edges, transparent background, centered." },
  { key: "deck-art", background: "filled", aspectRatio: "4:5", prompt:
    "Bottom-of-skateboard graphic art: a snarling mystical creature wrapped in vines and guitar strings, bold 90s skate-deck illustration, heavy black linework with cream, orange and teal fills, busy and energetic. No text." },
  { key: "sl-handstyle", background: "transparent", prompt:
    "Graffiti hand-style tag of the initials 'SL' with a small leaf flourish, single thick marker stroke, cream on transparent background, centered, raw and confident." },
  { key: "swamis-palms", background: "filled", aspectRatio: "4:5", prompt:
    "A minimalist screenprint of Swami's bluff palm trees against a big graphic setting sun, three flat colors (cream, coral, deep teal), calm surf-town poster aesthetic. No text." },
];

const designByKey = new Map(D.map((d) => [d.key, d]));

// ---- Products (~28) ------------------------------------------------------------
const P: Product[] = [
  // Capsule 1 — Coast / 101
  { slug: "coast-sunset-tee", name: "COAST SUNSET TEE", design: "coast-sunset", blank: BLANK.tee, category: "tees", placement: "back", priceCents: 4400, colors: ["Black", "White"], description: "North County coastline at dusk, big back print. Heavyweight cotton tee for sessions, not closets." },
  { slug: "coast-sunset-hoodie", name: "COAST SUNSET HOODIE", design: "coast-sunset", blank: BLANK.hoodie, category: "hoodies", placement: "back", priceCents: 8800, colors: ["Black", "Sport Grey"], description: "The Highway 101 dusk graphic across the back of a heavyweight pullover hoodie." },
  { slug: "coast-sunset-crew", name: "COAST SUNSET CREW", design: "coast-sunset", blank: BLANK.crew, category: "hoodies", placement: "back", priceCents: 7800, colors: ["Black", "Sport Grey"], description: "Coast dusk back print on a classic crewneck sweatshirt." },
  { slug: "encinitas-92024-tee", name: "ENCINITAS 92024 TEE", design: "encinitas-arch", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4200, colors: ["Black", "White"], description: "Hometown arch wordmark. 92024, where it started." },
  { slug: "swamis-palms-tee", name: "SWAMI'S PALMS TEE", design: "swamis-palms", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4400, colors: ["White", "Black"], description: "Swami's bluff palms and a big flat sun. Three-color surf-town poster on cotton." },
  // Capsule 2 — Tri-color camo
  { slug: "tricolor-camo-hoodie", name: "TRI-COLOR CAMO HOODIE", design: "tricolor-camo", blank: BLANK.hoodie, category: "hoodies", placement: "back", priceCents: 9200, colors: ["Black"], description: "The tri-color camo, hand-painted and printed big. Heavyweight pullover." },
  { slug: "tricolor-camo-crew", name: "TRI-COLOR CAMO CREW", design: "tricolor-camo", blank: BLANK.crew, category: "hoodies", placement: "back", priceCents: 8200, colors: ["Black", "Sport Grey"], description: "Original tri-color camo across the back of a crewneck." },
  { slug: "lawyer-camo-tee", name: "LAWYER CAMO TEE", design: "lawyer-camo-word", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4400, colors: ["Black", "White"], description: "The wordmark, filled with the camo. Front print, heavyweight cotton." },
  { slug: "lawyer-camo-hoodie", name: "LAWYER CAMO HOODIE", design: "lawyer-camo-word", blank: BLANK.hoodie, category: "hoodies", placement: "front", priceCents: 8800, colors: ["Black"], description: "Camo-filled wordmark on a pullover hoodie chest." },
  { slug: "tricolor-camo-tote", name: "TRI-COLOR CAMO TOTE", design: "tricolor-camo", blank: BLANK.tote, category: "accessories", placement: "front", priceCents: 2800, colors: ["Black", "Natural"], description: "Camo graphic on a heavy cotton tote. Carry your wax." },
  // Capsule 3 — Nylon strings
  { slug: "nylon-guitar-tee", name: "NYLON STRINGS TEE", design: "nylon-guitar", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4400, colors: ["Black", "White"], description: "Single-line classical guitar and falling leaves. For the after-skate practice sessions." },
  { slug: "nylon-guitar-crew", name: "NYLON STRINGS CREW", design: "nylon-guitar", blank: BLANK.crew, category: "hoodies", placement: "front", priceCents: 7800, colors: ["Black", "Sport Grey"], description: "Line-art classical guitar on a crewneck chest." },
  { slug: "deck-guitar-hoodie", name: "DECK & STRINGS HOODIE", design: "deck-guitar", blank: BLANK.hoodie, category: "hoodies", placement: "back", priceCents: 8800, colors: ["Black", "Sport Grey"], description: "Skate deck fused with a guitar neck, etched across the back." },
  { slug: "nylon-guitar-hoodie", name: "NYLON STRINGS HOODIE", design: "nylon-guitar", blank: BLANK.hoodie, category: "hoodies", placement: "front", priceCents: 8800, colors: ["Black"], description: "Line-art guitar on a pullover chest." },
  // Capsule 4 — Garden / leaf
  { slug: "garden-leaf-hoodie", name: "GARDEN HOODIE", design: "garden-leaf", blank: BLANK.hoodie, category: "hoodies", placement: "back", priceCents: 9200, colors: ["Black"], description: "Psychedelic botanical garden across the back of a heavyweight hoodie." },
  { slug: "garden-leaf-tee", name: "GARDEN TEE", design: "garden-leaf", blank: BLANK.tee, category: "tees", placement: "back", priceCents: 4600, colors: ["Black", "White"], description: "70s-poster botanical back print on cotton." },
  { slug: "garden-leaf-crew", name: "GARDEN CREW", design: "garden-leaf", blank: BLANK.crew, category: "hoodies", placement: "back", priceCents: 7800, colors: ["Black", "Sport Grey"], description: "Botanical garden back print on a crewneck." },
  { slug: "small-leaf-tee", name: "LEAF PATCH TEE", design: "small-leaf", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4200, colors: ["White", "Black"], description: "Small, clean leaf emblem. Subtle." },
  { slug: "garden-leaf-tote", name: "GARDEN TOTE", design: "garden-leaf", blank: BLANK.tote, category: "accessories", placement: "front", priceCents: 2800, colors: ["Natural", "Black"], description: "Botanical garden print on a heavy cotton tote." },
  // Capsule 5 — FAM / skate DIY
  { slug: "keep-pushing-tee", name: "KEEP PUSHING TEE", design: "griptape", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4200, colors: ["Black", "White"], description: "Grip-tape scrawl. Keep pushing." },
  { slug: "keep-pushing-crew", name: "KEEP PUSHING CREW", design: "griptape", blank: BLANK.crew, category: "hoodies", placement: "front", priceCents: 7800, colors: ["Black", "Sport Grey"], description: "Grip-tape 'keep pushing' on a crewneck chest." },
  { slug: "keep-pushing-hoodie", name: "KEEP PUSHING HOODIE", design: "griptape", blank: BLANK.hoodie, category: "hoodies", placement: "front", priceCents: 8800, colors: ["Black"], description: "Grip-tape scrawl on a pullover chest." },
  { slug: "deck-art-hoodie", name: "DECK ART HOODIE", design: "deck-art", blank: BLANK.hoodie, category: "hoodies", placement: "back", priceCents: 9200, colors: ["Black"], description: "90s deck-bottom creature, vines and strings, across the back." },
  { slug: "deck-art-tee", name: "DECK ART TEE", design: "deck-art", blank: BLANK.tee, category: "tees", placement: "back", priceCents: 4600, colors: ["Black"], description: "Deck-bottom illustration as a big back print." },
  { slug: "sl-handstyle-tee", name: "SL HANDSTYLE TEE", design: "sl-handstyle", blank: BLANK.tee, category: "tees", placement: "front", priceCents: 4200, colors: ["Black", "White"], description: "The SL tag. Marker on cotton." },
  { slug: "sl-handstyle-hoodie", name: "SL HANDSTYLE HOODIE", design: "sl-handstyle", blank: BLANK.hoodie, category: "hoodies", placement: "front", priceCents: 8800, colors: ["Black"], description: "SL hand-style on a pullover chest." },
  { slug: "lawyer-camo-crew", name: "LAWYER CAMO CREW", design: "lawyer-camo-word", blank: BLANK.crew, category: "hoodies", placement: "front", priceCents: 7800, colors: ["Black", "Sport Grey"], description: "Camo wordmark on a crewneck chest." },
  { slug: "swamis-palms-tote", name: "SWAMI'S TOTE", design: "swamis-palms", blank: BLANK.tote, category: "accessories", placement: "front", priceCents: 2800, colors: ["Natural", "Black"], description: "Swami's palms on a heavy cotton tote." },
];

async function ensureCatalogue(): Promise<string> {
  const [existing] = await db.select().from(catalogues).where(eq(catalogues.slug, CATALOGUE.slug)).limit(1);
  if (existing) return existing.id;
  const [row] = await db.insert(catalogues).values(CATALOGUE).returning();
  return row.id;
}

// Generate (or reuse) a design; returns its cloudinary public id + url.
async function ensureDesign(catalogueId: string, d: Design): Promise<{ publicId: string; url: string }> {
  const label = `Drop1 — ${d.key}`;
  const [existing] = await db
    .select()
    .from(designs)
    .where(and(eq(designs.catalogueId, catalogueId), eq(designs.prompt, label)))
    .limit(1);
  if (existing) {
    console.log(`  · reuse design ${d.key}`);
    return { publicId: existing.cloudinaryPublicId, url: existing.url };
  }
  console.log(`  · generating design ${d.key}…`);
  const png = await generateDesign(d.prompt, { background: d.background, aspectRatio: d.aspectRatio });
  const up = await uploadImage(png, {
    folder: `stephen-lawyer/designs/${CATALOGUE.slug}`,
    removeBackground: d.background === "transparent",
  });
  await db.insert(designs).values({
    catalogueId,
    prompt: label,
    cloudinaryPublicId: up.publicId,
    url: up.secureUrl,
    thumbUrl: thumbUrl(up.publicId, 256),
  });
  return { publicId: up.publicId, url: up.secureUrl };
}

// Design aspect ratio (w/h). Filled designs carry it; transparent are ~square.
function aspectOf(d: Design): number {
  if (d.background !== "filled" || !d.aspectRatio) return 1;
  const [w, h] = d.aspectRatio.split(":").map(Number);
  return w && h ? w / h : 1;
}

// A centered box that fits `aspect` inside the print area (print-file px).
function fitPosition(areaWidth: number, areaHeight: number, aspect: number): MockupPosition {
  let width = areaWidth;
  let height = Math.round(width / aspect);
  if (height > areaHeight) {
    height = areaHeight;
    width = Math.round(height * aspect);
  }
  return {
    area_width: areaWidth,
    area_height: areaHeight,
    width,
    height,
    left: Math.round((areaWidth - width) / 2),
    top: Math.round((areaHeight - height) / 2),
  };
}

// Cache the print-area dimensions per blank (placement → area).
const printAreas = new Map<number, { variantId: number | null; byPlacement: Map<string, { areaWidth: number; areaHeight: number }> }>();
async function areaFor(blank: number, placement: string): Promise<{ areaWidth: number; areaHeight: number } | null> {
  let entry = printAreas.get(blank);
  if (!entry) {
    const pf = await getProductPrintfiles(blank);
    entry = { variantId: pf.variantId, byPlacement: new Map(pf.placements.map((p) => [p.placement, { areaWidth: p.areaWidth, areaHeight: p.areaHeight }])) };
    printAreas.set(blank, entry);
  }
  return entry.byPlacement.get(placement) ?? entry.byPlacement.values().next().value ?? null;
}

// Render a real Printful mockup for the product and store it durably on Cloudinary.
async function renderHero(
  slug: string,
  blank: number,
  variantId: number,
  placement: string,
  designUrl: string,
  position: MockupPosition,
): Promise<string | null> {
  // The mockup generator is rate-limited (~2/min). Retry on 429, honoring the
  // "try again after N seconds" hint.
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const tmp = await renderMockup(blank, variantId, { placement, image_url: designUrl, position });
      const res = await fetch(tmp);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const up = await uploadImage(buf, { folder: `stephen-lawyer/mockups/${CATALOGUE.slug}`, publicId: slug });
      return up.secureUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const m = /try again after (\d+) second/i.exec(msg);
      if (m && attempt < 5) {
        const wait = Number(m[1]) + 4;
        console.log(`  · rate-limited, waiting ${wait}s…`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      console.log(`  ! mockup failed: ${msg}`);
      return null;
    }
  }
  return null;
}

async function main() {
  const arg = process.argv[2] ?? "4";
  const limit = arg === "all" ? P.length : Math.max(1, Number(arg) || 4);
  const slice = P.slice(0, limit);
  console.log(`Publishing ${slice.length}/${P.length} products to catalogue "${CATALOGUE.slug}"`);

  const catalogueId = await ensureCatalogue();

  // Clean replace: delete any existing Printful product (and DB row) whose name
  // matches a product we're about to (re)publish, so re-runs never duplicate.
  const targetNames = new Set(slice.map((p) => p.name));
  const existing = await listSyncProducts(100);
  for (const sp of existing) {
    if (targetNames.has(sp.name)) {
      try {
        await deleteSyncProduct(sp.id);
        await db.delete(products).where(eq(products.printfulSyncProductId, String(sp.id)));
        console.log(`  ~ removed prior "${sp.name}" (#${sp.id})`);
      } catch (e) {
        console.log(`  ! could not remove #${sp.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const designByKeyCache = new Map<string, { publicId: string; url: string }>();
  const published: { syncId: string; p: Product; hero: string | null }[] = [];

  for (const p of slice) {
    console.log(`\n▶ ${p.name} (${p.slug})`);
    const design = designByKey.get(p.design)!;
    let resolved = designByKeyCache.get(p.design);
    if (!resolved) {
      resolved = await ensureDesign(catalogueId, design);
      designByKeyCache.set(p.design, resolved);
    }

    const { variants: catVariants } = await getCatalogProduct(p.blank);
    const wanted = catVariants.filter((v) => p.colors.some((c) => v.color?.toLowerCase().includes(c.toLowerCase())));
    const colorsToUse = wanted.length ? wanted : catVariants.filter((_, i, a) => {
      const firstTwo = [...new Set(a.map((x) => x.color))].slice(0, 2);
      return firstTwo.includes(a[i].color);
    });
    if (!colorsToUse.length) {
      console.log(`  ! no variants resolved for blank ${p.blank}, skipping`);
      continue;
    }
    const printUrl = upscaleForPrint(resolved.publicId);
    const area = await areaFor(p.blank, p.placement);
    const position = area ? fitPosition(area.areaWidth, area.areaHeight, aspectOf(design)) : undefined;
    try {
      const synced = await createSyncProduct(
        {
          sync_product: { name: p.name, external_id: p.slug },
          sync_variants: colorsToUse.map((v) => ({
            variant_id: v.id,
            retail_price: (p.priceCents / 100).toFixed(2),
            files: [{ type: p.placement, url: printUrl, ...(position ? { position } : {}) }],
          })),
        },
        p.slug,
      );
      const syncId = String(synced.sync_product?.id ?? "");
      console.log(`  ✓ published Printful #${syncId} (${colorsToUse.length} variants)`);
      if (syncId) {
        const hero = position
          ? await renderHero(p.slug, p.blank, colorsToUse[0].id, p.placement, resolved.url, position)
          : null;
        console.log(`    mockup: ${hero ? "ok" : "(fell back)"}`);
        published.push({ syncId, p, hero });
      }
    } catch (e) {
      console.log(`  ✗ Printful publish failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\nSyncing Printful → DB…`);
  const summary = await syncPrintfulCatalog();
  console.log(`  products upserted: ${summary.productsUpserted}, variants: ${summary.variantsUpserted}, errors: ${summary.errors.length}`);

  for (const { syncId, p, hero } of published) {
    await db
      .update(products)
      .set({ isPublished: true, descriptionMd: p.description, category: p.category, ...(hero ? { heroImageUrl: hero } : {}) })
      .where(eq(products.printfulSyncProductId, syncId));
  }
  console.log(`\nDone. Published ${published.length} products.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
