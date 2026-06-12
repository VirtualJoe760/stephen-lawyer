import { db } from "../src/lib/db";
import { products, variants } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  for (const p of rows) {
    const vs = await db.select().from(variants).where(eq(variants.productId, p.id)).limit(1);
    console.log(`\n${p.isPublished ? "●" : "○"} [${p.category}] ${p.name}`);
    console.log(`   hero: ${p.heroImageUrl ?? "(none)"}`);
    console.log(`   var:  ${vs[0]?.imageUrl ?? "(none)"}`);
    console.log(`   price: $${((vs[0]?.retailPriceCents ?? 0) / 100).toFixed(2)}`);
  }
  console.log(`\ntotal products: ${rows.length}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
