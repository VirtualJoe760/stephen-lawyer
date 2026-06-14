import "server-only";
import type { Category, ProductSummary, ProductDetail, ProductVariantOption } from "@/types";

// Products now come from the Nanocrew platform (single source of truth for catalog + price +
// fulfillment), not this site's own DB. We fetch the public catalog and map it to the storefront's
// types. Apparel category (for care/sizing copy) is inferred from the product name, since the
// Nanocrew catalog is brand-agnostic. See NANOCREW.md.

const API = process.env.NANOCREW_API;
const STORE_SLUG = "stephen-lawyer";

// Printful color-name → hex; falls back to a neutral.
const COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  white: "#f5f5f3",
  navy: "#1f2a44",
  "navy blue": "#1f2a44",
  "sport grey": "#9c9c9c",
  "sport gray": "#9c9c9c",
  "heather grey": "#b3b3b3",
  "dark heather": "#5a5a5a",
  ash: "#dcdcdc",
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

function categoryFromName(name: string): Category {
  const n = name.toLowerCase();
  if (/hood|crew|warmup|sweat/.test(n)) return "hoodies";
  if (/hat|cap|beanie/.test(n)) return "hats";
  if (/tote|bag|sticker|pin|sock/.test(n)) return "accessories";
  return "tees";
}

type ApiVariant = { id: string; sku: string; color: string | null; size: string | null; retailPriceCents: number; inStock: boolean };
type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  descriptionMd?: string | null;
  priceCents?: number | null;
  variants: ApiVariant[];
  modelShots?: string[] | null;
};

async function fetchProducts(): Promise<ApiProduct[]> {
  if (!API) return [];
  try {
    const res = await fetch(`${API}/api/public/stores/${STORE_SLUG}/products`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const d = (await res.json()) as { products?: ApiProduct[] };
    return d.products ?? [];
  } catch {
    return [];
  }
}

function toSummary(p: ApiProduct): ProductSummary {
  const prices = p.variants.map((v) => v.retailPriceCents).filter((n) => n > 0);
  const colorNames = [...new Set(p.variants.map((v) => v.color).filter(Boolean) as string[])];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: categoryFromName(p.name),
    priceCents: p.priceCents ?? (prices.length ? Math.min(...prices) : 0),
    currency: "USD",
    primaryImage: p.imageUrl ?? "",
    hoverImage: p.modelShots?.[0],
    colors: colorNames.map((name) => ({ name, hex: hexFor(name) })),
  };
}

export async function getPublishedSummaries(category?: Category): Promise<ProductSummary[]> {
  const summaries = (await fetchProducts()).map(toSummary);
  return category ? summaries.filter((s) => s.category === category) : summaries;
}

export async function getPublishedProduct(slug: string): Promise<ProductDetail | null> {
  const p = (await fetchProducts()).find((x) => x.slug === slug);
  if (!p) return null;
  const summary = toSummary(p);
  const defaults = CARE_BY_CAT[summary.category];
  const gallery = [...new Set([p.imageUrl, ...(p.modelShots ?? [])].filter(Boolean) as string[])];
  const variants: ProductVariantOption[] = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    color: v.color ?? "Default",
    colorHex: hexFor(v.color),
    size: v.size ?? "OS",
    inStock: v.inStock,
    priceCents: v.retailPriceCents,
    imageUrl: p.imageUrl ?? "",
  }));
  return {
    ...summary,
    description: p.descriptionMd ?? "",
    materials: defaults.materials,
    care: defaults.care,
    sizingNote: defaults.sizingNote,
    gallery: gallery.length ? gallery : summary.primaryImage ? [summary.primaryImage] : [],
    variants,
  };
}

export async function hasPublishedProducts(): Promise<boolean> {
  return (await fetchProducts()).length > 0;
}

// Storefront accessors: use live Nanocrew products once any exist, else the mock placeholders.
export async function getStoreSummaries(category?: Category): Promise<ProductSummary[]> {
  if (await hasPublishedProducts()) return getPublishedSummaries(category);
  const { getMockSummaries } = await import("@/lib/mock-products");
  return getMockSummaries(category);
}

export async function getStoreProduct(slug: string): Promise<ProductDetail | null> {
  const live = await getPublishedProduct(slug);
  if (live) return live;
  if (await hasPublishedProducts()) return null; // live mode: unknown slug is a 404
  const { getMockProduct } = await import("@/lib/mock-products");
  return getMockProduct(slug) ?? null;
}
