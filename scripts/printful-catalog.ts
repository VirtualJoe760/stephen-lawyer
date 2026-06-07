/**
 * Prints, for each curated template, the live Printful catalog product image
 * (a candidate `mockupUrl`) and its variant IDs (color / size / price) so you
 * can fill `src/lib/printful/templates.ts` accurately — no guessing.
 *
 * Run:  pnpm printful:catalog   (requires PRINTFUL_API_KEY in .env.local)
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { TEMPLATES } from "../src/lib/printful/templates";
import { getCatalogProduct } from "../src/lib/printful/client";

async function main() {
  if (!process.env.PRINTFUL_API_KEY) {
    console.error("PRINTFUL_API_KEY not set in .env.local");
    process.exit(1);
  }

  for (const t of TEMPLATES) {
    console.log(`\n=== ${t.key} — ${t.name} ===`);
    if (!t.printfulProductId) {
      console.log("  printfulProductId is null — find the blank in Printful and set it first.");
      continue;
    }
    try {
      const { product, variants } = await getCatalogProduct(t.printfulProductId);
      console.log(`  product: ${product.id} "${product.title}" (${product.variant_count} variants)`);
      console.log(`  mockupUrl candidate: ${product.image}`);
      console.log(`  variantIds: [${variants.map((v) => v.id).join(", ")}]`);
      for (const v of variants) {
        console.log(`    ${v.id}  ${v.color} / ${v.size}  $${v.price}`);
      }
    } catch (e) {
      console.log(`  ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
