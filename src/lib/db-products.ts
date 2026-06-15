import "server-only";
import type { Category, ProductSummary, ProductDetail, ProductVariantOption } from "@/types";

// Catalogue cutover: products now come from the Nanocrew platform API (the Nanocrew app is the
// single source of truth) instead of this site's own database. Exported function signatures and
// return types are unchanged, so the home, shop and product pages keep working as-is.
const NANOCREW_API = (process.env.NANOCREW_API_BASE ?? "https://nanocrew-api.vercel.app").replace(/\/$/, "");
const STORE_SLUG = process.env.NANOCREW_STORE_SLUG ?? "stephen-lawyer";

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

// Nanocrew products carry a free-text category; map product names to this site's fixed set.
function inferCategory(name: string): Category {
  const n = name.toLowerCase();
  if (/\b(hat|cap|beanie|bucket)\b/.test(n)) return "hats";
  if (/hoodie|crew|pullover|sweat|zip/.test(n)) return "hoodies";
  if (/\b(tote|bag|sticker|pin|patch|sock|mug|deck|accessor)/.test(n)) return "accessories";
  return "tees";
}

type ApiRow = {
  id: string;
  slug: string;
  name: string;
  descriptionMd: string | null;
  imageUrl: string | null;
  modelShots?: string[] | null;
  variantId?: string | null;
  sku?: string | null;
  color?: string | null;
  size?: string | null;
  retailPriceCents?: number | null;
  inStock?: boolean | null;
};
type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  descriptionMd: string | null;
  images: string[];
  variants: { id: string; sku: string | null; color: string | null; size: string | null; priceCents: number | null; inStock: boolean }[];
};

async function fetchProducts(): Promise<ApiProduct[]> {
  try {
    const res = await fetch(`${NANOCREW_API}/api/public/stores/${STORE_SLUG}/products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { products?: ApiRow[] } | ApiRow[];
    const rows: ApiRow[] = Array.isArray(data) ? data : data.products ?? [];
    const byId = new Map<string, ApiProduct>();
    for (const r of rows) {
      let p = byId.get(r.id);
      if (!p) {
        p = {
          id: r.id,
          slug: r.slug,
          name: r.name,
          descriptionMd: r.descriptionMd ?? null,
          images: [r.imageUrl, ...(r.modelShots ?? [])].filter((x): x is string => !!x),
          variants: [],
        };
        byId.set(r.id, p);
      }
      if (r.variantId) {
        p.variants.push({
          id: r.variantId,
          sku: r.sku ?? null,
          color: r.color ?? null,
          size: r.size ?? null,
          priceCents: r.retailPriceCents ?? null,
          inStock: r.inStock ?? true,
        });
      }
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

function toSummary(p: ApiProduct): ProductSummary {
  const prices = p.variants.map((v) => v.priceCents).filter((n): n is number => !!n && n > 0);
  const colorNames = [...new Set(p.variants.map((v) => v.color).filter(Boolean) as string[])];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: inferCategory(p.name),
    priceCents: prices.length ? Math.min(...prices) : 0,
    currency: "USD",
    primaryImage: p.images[0] ?? "",
    hoverImage: p.images[1],
    colors: colorNames.map((name) => ({ name, hex: hexFor(name) })),
  };
}

export async function getPublishedSummaries(category?: Category): Promise<ProductSummary[]> {
  const sums = (await fetchProducts()).map(toSummary);
  return category ? sums.filter((s) => s.category === category) : sums;
}

export async function getPublishedProduct(slug: string): Promise<ProductDetail | null> {
  const p = (await fetchProducts()).find((x) => x.slug === slug);
  if (!p) return null;
  const summary = toSummary(p);
  const care = CARE_BY_CAT[summary.category];
  const gallery = p.images.length ? p.images : summary.primaryImage ? [summary.primaryImage] : [];
  const variants: ProductVariantOption[] = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku ?? v.id,
    color: v.color ?? "Default",
    colorHex: hexFor(v.color),
    size: v.size ?? "OS",
    inStock: v.inStock,
    priceCents: v.priceCents ?? summary.priceCents,
    imageUrl: gallery[0] ?? "",
  }));
  return {
    ...summary,
    description: p.descriptionMd ?? "",
    materials: care.materials,
    care: care.care,
    sizingNote: care.sizingNote,
    gallery,
    variants,
  };
}

export async function hasPublishedProducts(): Promise<boolean> {
  return (await fetchProducts()).length > 0;
}

// Storefront accessors (kept for compatibility; now always Nanocrew-backed).
export async function getStoreSummaries(category?: Category): Promise<ProductSummary[]> {
  return getPublishedSummaries(category);
}
export async function getStoreProduct(slug: string): Promise<ProductDetail | null> {
  return getPublishedProduct(slug);
}
