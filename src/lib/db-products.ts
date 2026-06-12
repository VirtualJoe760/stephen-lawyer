import "server-only";
import { db } from "@/lib/db";
import { products, variants } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Category, ProductSummary, ProductDetail, ProductVariantOption } from "@/types";

// Best-effort color-name → hex (Printful color names). Falls back to a neutral.
const COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  white: "#f5f5f3",
  navy: "#1f2a44",
  "navy blue": "#1f2a44",
  "sport grey": "#9c9c9c",
  "sport gray": "#9c9c9c",
  "heather grey": "#b3b3b3",
  "dark heather": "#5a5a5a",
  "ash": "#dcdcdc",
  natural: "#e9e1cf",
  sand: "#d8c9a8",
  red: "#b91c1c",
  maroon: "#5b1a22",
  royal: "#1d4ed8",
  "carolina blue": "#7fb3df",
  "forest green": "#1f3b2c",
  "military green": "#4b5320",
  charcoal: "#36454f",
  "oatmeal triblend": "#dcd3bf",
};
const hexFor = (name: string | null) => COLOR_HEX[(name ?? "").trim().toLowerCase()] ?? "#8a8a8a";

const CARE_BY_CAT: Record<Category, { materials: string; care: string; sizingNote: string }> = {
  tees: {
    materials: "Midweight cotton jersey.",
    care: "Machine wash cold inside-out. Tumble dry low. Don't iron the print.",
    sizingNote: "Unisex fit — true to size, size up for boxy.",
  },
  hoodies: {
    materials: "Heavyweight cotton/poly fleece.",
    care: "Machine wash cold inside-out. Tumble dry low. Don't iron the print.",
    sizingNote: "Relaxed fit — true to size.",
  },
  hats: { materials: "Structured cotton twill.", care: "Spot clean.", sizingNote: "One size, adjustable." },
  accessories: { materials: "Heavy cotton canvas.", care: "Spot clean. Hand wash cold.", sizingNote: "One size." },
};

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof variants.$inferSelect;

function toSummary(p: ProductRow, vs: VariantRow[]): ProductSummary {
  const prices = vs.map((v) => v.retailPriceCents).filter((n) => n > 0);
  const colorNames = [...new Set(vs.map((v) => v.color).filter(Boolean) as string[])];
  const firstImg = vs.find((v) => v.imageUrl)?.imageUrl ?? null;
  const recent = Date.now() - new Date(p.createdAt).getTime() < 21 * 24 * 60 * 60 * 1000;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category as Category,
    priceCents: prices.length ? Math.min(...prices) : 0,
    currency: vs[0]?.currency ?? "USD",
    primaryImage: p.heroImageUrl ?? firstImg ?? "",
    hoverImage: undefined,
    colors: colorNames.map((name) => ({ name, hex: hexFor(name) })),
    badges: recent ? ["NEW"] : undefined,
  };
}

export async function getPublishedSummaries(category?: Category): Promise<ProductSummary[]> {
  const where = category
    ? and(eq(products.isPublished, true), eq(products.category, category))
    : eq(products.isPublished, true);
  const rows = await db.select().from(products).where(where).orderBy(desc(products.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const allVariants = await db.select().from(variants).where(inArray(variants.productId, ids));
  const byProduct = new Map<string, VariantRow[]>();
  for (const v of allVariants) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }
  return rows.map((p) => toSummary(p, byProduct.get(p.id) ?? []));
}

export async function getPublishedProduct(slug: string): Promise<ProductDetail | null> {
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isPublished, true)))
    .limit(1);
  if (!p) return null;
  const vs = await db.select().from(variants).where(eq(variants.productId, p.id));
  const summary = toSummary(p, vs);
  const defaults = CARE_BY_CAT[p.category as Category];
  const gallery = [...new Set([p.heroImageUrl, ...vs.map((v) => v.imageUrl)].filter(Boolean) as string[])];
  const variantOptions: ProductVariantOption[] = vs.map((v) => ({
    id: v.id,
    sku: v.sku,
    color: v.color ?? "Default",
    colorHex: hexFor(v.color),
    size: v.size ?? "OS",
    inStock: v.inStock,
    priceCents: v.retailPriceCents,
    imageUrl: v.imageUrl ?? p.heroImageUrl ?? "",
  }));
  return {
    ...summary,
    description: p.descriptionMd ?? "",
    materials: defaults.materials,
    care: defaults.care,
    sizingNote: defaults.sizingNote,
    gallery: gallery.length ? gallery : summary.primaryImage ? [summary.primaryImage] : [],
    variants: variantOptions,
  };
}

export async function hasPublishedProducts(): Promise<boolean> {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.isPublished, true)).limit(1);
  return Boolean(row);
}

// Storefront accessors: use published DB products once any exist, else fall back
// to the mock placeholders (so the shop never goes blank mid-migration).
export async function getStoreSummaries(category?: Category): Promise<ProductSummary[]> {
  const { getMockSummaries } = await import("@/lib/mock-products");
  if (await hasPublishedProducts()) return getPublishedSummaries(category);
  return getMockSummaries(category);
}

export async function getStoreProduct(slug: string): Promise<ProductDetail | null> {
  const live = await getPublishedProduct(slug);
  if (live) return live;
  if (await hasPublishedProducts()) return null; // live mode: unknown slug is a 404
  const { getMockProduct } = await import("@/lib/mock-products");
  return getMockProduct(slug) ?? null;
}
