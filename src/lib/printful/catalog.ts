import { listCatalogProducts, listCategories, type PrintfulCategory } from "./client";

// Server-side, full Printful catalog browsing for the design tool.
// Each product is tagged with a gender bucket (root category) AND a type
// (the second-level category, e.g. "T-shirts", "Hoodies") for drill-down.

export type BlankCategory = "men" | "women" | "kids" | "accessories";

export interface CatalogBlank {
  id: number;
  name: string;
  image: string;
  category: BlankCategory; // gender/age bucket
  type: string; // second-level type, e.g. "T-shirts", "Hoodies", "Bottoms"
}

const ROOT_TO_BUCKET: Record<string, BlankCategory> = {
  "Men's clothing": "men",
  "Women's clothing": "women",
  "Kids' & youth clothing": "kids",
  Accessories: "accessories",
  Hats: "accessories",
};

let cache: { at: number; blanks: CatalogBlank[] } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function getCatalogBlanks(force = false): Promise<CatalogBlank[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.blanks;

  const [products, categories] = await Promise.all([listCatalogProducts(), listCategories()]);
  const byId = new Map(categories.map((c) => [c.id, c]));

  // Chain from a category id up to its root: [leaf, ..., root].
  const chainToRoot = (cid: number): PrintfulCategory[] => {
    const out: PrintfulCategory[] = [];
    let c = byId.get(cid);
    let guard = 0;
    while (c && guard++ < 20) {
      out.push(c);
      if (!c.parent_id || c.parent_id === 0) break;
      c = byId.get(c.parent_id);
    }
    return out;
  };

  const blanks: CatalogBlank[] = [];
  for (const p of products) {
    if (p.is_discontinued) continue;
    const chain = chainToRoot(p.main_category_id);
    const root = chain[chain.length - 1];
    const bucket = root ? ROOT_TO_BUCKET[root.title] : undefined;
    if (!bucket) continue; // excludes Home & living etc.
    // The type is the category directly under the root (second from the end).
    const type = chain.length >= 2 ? chain[chain.length - 2].title : "Other";
    blanks.push({ id: p.id, name: p.title, image: p.image, category: bucket, type });
  }
  blanks.sort((a, b) => a.name.localeCompare(b.name));

  cache = { at: Date.now(), blanks };
  return blanks;
}

export async function getBlank(id: number): Promise<CatalogBlank | undefined> {
  return (await getCatalogBlanks()).find((b) => b.id === id);
}
