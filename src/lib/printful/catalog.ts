import { listCatalogProducts, listCategories } from "./client";

// Server-side, full Printful catalog browsing for the design tool.
// Products are classified into buckets by walking main_category_id to its root.

export type BlankCategory = "men" | "women" | "kids" | "accessories";

export interface CatalogBlank {
  id: number;
  name: string;
  image: string;
  category: BlankCategory;
}

// Root Printful category title → our bucket. Roots not listed (Home & living,
// Collections, Brands, All products) are excluded from the design tool.
const ROOT_TO_BUCKET: Record<string, BlankCategory> = {
  "Men's clothing": "men",
  "Women's clothing": "women",
  "Kids' & youth clothing": "kids",
  Accessories: "accessories",
  Hats: "accessories",
};

let cache: { at: number; blanks: CatalogBlank[] } | null = null;
const TTL_MS = 60 * 60 * 1000; // catalog is near-static; cache 1h per server process

export async function getCatalogBlanks(force = false): Promise<CatalogBlank[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.blanks;

  const [products, categories] = await Promise.all([listCatalogProducts(), listCategories()]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const rootTitle = (cid: number): string => {
    let c = byId.get(cid);
    let guard = 0;
    while (c && c.parent_id && c.parent_id !== 0 && guard++ < 20) c = byId.get(c.parent_id);
    return c?.title ?? "";
  };

  const blanks: CatalogBlank[] = [];
  for (const p of products) {
    if (p.is_discontinued) continue;
    const bucket = ROOT_TO_BUCKET[rootTitle(p.main_category_id)];
    if (!bucket) continue; // excludes Home & living etc.
    blanks.push({ id: p.id, name: p.title, image: p.image, category: bucket });
  }
  blanks.sort((a, b) => a.name.localeCompare(b.name));

  cache = { at: Date.now(), blanks };
  return blanks;
}

export async function getBlank(id: number): Promise<CatalogBlank | undefined> {
  return (await getCatalogBlanks()).find((b) => b.id === id);
}
