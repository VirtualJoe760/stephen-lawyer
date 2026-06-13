/**
 * Fix the existing transparent designs (Gemini baked a checkerboard background):
 * strip the background on each design asset in place, then re-render every
 * affected product's storefront mockup using a VERSION-pinned URL so Printful
 * re-fetches the now-transparent image (instead of its cached opaque copy).
 *
 *   npx tsx --env-file=.env.local scripts/fix-transparency.ts
 */
import { db } from "../src/lib/db";
import { products, designs } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { removeBackgroundInPlace, versionedPrintUrl, uploadImage } from "../src/lib/cloudinary";
import { readProductDesign } from "../src/lib/printful/republish";
import { renderMockup, type MockupPosition } from "../src/lib/printful/client";

// design key -> products that use it
const DESIGNS: Record<string, string[]> = {
  "encinitas-arch": ["ENCINITAS 92024 TEE"],
  "lawyer-camo-word": ["LAWYER CAMO TEE", "LAWYER CAMO HOODIE", "LAWYER CAMO CREW"],
  "nylon-guitar": ["NYLON STRINGS TEE", "NYLON STRINGS CREW", "NYLON STRINGS HOODIE"],
  "deck-guitar": ["DECK & STRINGS HOODIE"],
  "small-leaf": ["LEAF PATCH TEE"],
  "griptape": ["KEEP PUSHING TEE", "KEEP PUSHING CREW", "KEEP PUSHING HOODIE"],
  "sl-handstyle": ["SL HANDSTYLE TEE", "SL HANDSTYLE HOODIE"],
};

function centered(areaW: number, areaH: number, placement: string): MockupPosition {
  const side = Math.round(areaW * (placement === "back" ? 0.85 : 0.55));
  const left = Math.round((areaW - side) / 2);
  const top = placement === "back" ? Math.round((areaH - side) / 2) : Math.round(areaH * 0.15);
  return { area_width: areaW, area_height: areaH, width: side, height: side, left, top };
}

async function renderHero(blank: number, variantId: number, placement: string, designUrl: string, position: MockupPosition, slug: string): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const tmp = await renderMockup(blank, variantId, { placement, image_url: designUrl, position });
      const res = await fetch(tmp);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const up = await uploadImage(buf, { folder: "stephen-lawyer/mockups/fixed", publicId: slug });
      return up.secureUrl;
    } catch (e) {
      const m = /try again after (\d+) second/i.exec(e instanceof Error ? e.message : String(e));
      if (m && attempt < 5) {
        const wait = Number(m[1]) + 4;
        console.log(`    · rate-limited, waiting ${wait}s…`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      console.log(`    ! mockup failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  return null;
}

async function main() {
  for (const [key, names] of Object.entries(DESIGNS)) {
    const [d] = await db.select().from(designs).where(eq(designs.prompt, `Drop1 — ${key}`)).limit(1);
    if (!d) { console.log(`? design not found: ${key}`); continue; }
    const version = await removeBackgroundInPlace(d.cloudinaryPublicId);
    if (!version) { console.log(`✗ bg-removal failed: ${key}`); continue; }
    const designUrl = versionedPrintUrl(d.cloudinaryPublicId, version);
    console.log(`\n✓ stripped ${key} (v${version}) — ${names.length} products`);

    for (const name of names) {
      const [p] = await db.select().from(products).where(eq(products.name, name)).limit(1);
      if (!p) { console.log(`  ? product not found: ${name}`); continue; }
      const state = await readProductDesign(p.id);
      if (!state) { console.log(`  ? no design state: ${name}`); continue; }
      const area = state.areas.find((a) => a.placement === state.placement) ?? state.areas[0];
      const pos = centered(area.areaWidth, area.areaHeight, state.placement);
      const hero = await renderHero(state.blankProductId, state.renderVariantId, state.placement, designUrl, pos, p.slug);
      if (hero) await db.update(products).set({ heroImageUrl: hero }).where(eq(products.id, p.id));
      console.log(`  ${hero ? "✓" : "✗"} ${name}`);
    }
  }
  console.log("\nDone.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
