import type { ProductDetail, ProductSummary } from "@/types";

const COLORS = {
  bone: { name: "Bone", hex: "#F4F1EA" },
  ink: { name: "Ink", hex: "#0F0F0F" },
  hazard: { name: "Hazard", hex: "#FF4A1C" },
  acid: { name: "Acid", hex: "#C8FF3F" },
  cobalt: { name: "Cobalt", hex: "#1F3DFF" },
  pink: { name: "Hot Pink", hex: "#FF2EA0" },
} as const;

const placeholder = (seed: string, w = 900, h = 1125) =>
  `https://picsum.photos/seed/${encodeURIComponent("sl-" + seed)}/${w}/${h}`;

interface MockSpec {
  slug: string;
  name: string;
  category: "tees" | "hoodies" | "hats" | "accessories";
  priceCents: number;
  colors: (keyof typeof COLORS)[];
  sizes: string[];
  badges?: ("NEW" | "RESTOCK" | "LOW")[];
  edition?: string;
  description: string;
  whyIMadeThis?: string;
  materials: string;
  care: string;
  sizingNote: string;
}

const SPECS: MockSpec[] = [
  {
    slug: "hazard-camo-hoodie",
    name: "HAZARD CAMO HOODIE",
    category: "hoodies",
    priceCents: 8800,
    colors: ["hazard", "acid", "ink"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    badges: ["NEW"],
    edition: "1/200",
    description:
      "Heavyweight pullover hoodie with all-over tri-color camo print. Drawcord with metal aglets. Front kangaroo pocket. Cut for a relaxed boxy fit.",
    whyIMadeThis:
      "The camo I've been printing in my sketchbook since 2019. Finally pulled the trigger on a real production run.",
    materials: "85% cotton / 15% polyester. 340 gsm fleece.",
    care: "Machine wash cold inside-out. Tumble dry low. Do not iron print.",
    sizingNote: "Boxy fit. True to size for relaxed, size down for fitted.",
  },
  {
    slug: "encinitas-skate-club-tee",
    name: "ENCINITAS SKATE CLUB TEE",
    category: "tees",
    priceCents: 4400,
    colors: ["bone", "ink", "cobalt"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "Heavyweight cotton tee with chest print and back graphic. Made for sessions, not closets.",
    materials: "100% cotton, 220 gsm.",
    care: "Machine wash cold inside-out. Tumble dry low.",
    sizingNote: "Boxy fit. True to size.",
  },
  {
    slug: "outline-wordmark-tee",
    name: "OUTLINE WORDMARK TEE",
    category: "tees",
    priceCents: 4200,
    colors: ["bone", "ink", "acid"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    badges: ["NEW"],
    description:
      "Oversized outlined STEPHEN LAWYER wordmark across the chest. Heavy 220 gsm cotton.",
    materials: "100% cotton.",
    care: "Machine wash cold. Tumble dry low.",
    sizingNote: "Relaxed boxy fit. Size down for slim.",
  },
  {
    slug: "ledge-life-tee",
    name: "LEDGE LIFE TEE",
    category: "tees",
    priceCents: 4400,
    colors: ["ink", "hazard", "pink"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    description:
      "Tribute to every busted shin. Stencil graphic, monospace serial number on the side seam.",
    materials: "100% cotton.",
    care: "Machine wash cold inside-out.",
    sizingNote: "Boxy fit.",
  },
  {
    slug: "zine-pullover-hoodie",
    name: "ZINE PULLOVER",
    category: "hoodies",
    priceCents: 9200,
    colors: ["ink", "bone"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    edition: "1/150",
    description:
      "Front graphic taken from the spring zine. Back panel features hand-set type. Hood lined in contrast color.",
    materials: "Heavyweight 380 gsm fleece. Brushed interior.",
    care: "Machine wash cold inside-out.",
    sizingNote: "True to size, boxy through the body.",
  },
  {
    slug: "tour-stops-hoodie",
    name: "TOUR STOPS HOODIE",
    category: "hoodies",
    priceCents: 8800,
    colors: ["ink", "cobalt"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    badges: ["RESTOCK"],
    description:
      "Cities I skated this year. Front chest hit, full back graphic with all the stops.",
    materials: "340 gsm fleece. 85/15 cotton-poly.",
    care: "Machine wash cold inside-out.",
    sizingNote: "True to size.",
  },
  {
    slug: "stencil-trucker-hat",
    name: "STENCIL TRUCKER HAT",
    category: "hats",
    priceCents: 3400,
    colors: ["ink", "bone", "acid"],
    sizes: ["One Size"],
    description: "Five-panel mesh-back trucker with embroidered stencil front. Snapback closure.",
    materials: "Cotton twill front, polyester mesh back.",
    care: "Spot clean only.",
    sizingNote: "Adjustable. Fits most.",
  },
  {
    slug: "low-pro-dad-hat",
    name: "LOW PRO DAD HAT",
    category: "hats",
    priceCents: 3200,
    colors: ["bone", "ink", "hazard"],
    sizes: ["One Size"],
    description:
      "Unstructured six-panel with curved brim. Tonal embroidered logo.",
    materials: "100% cotton.",
    care: "Spot clean.",
    sizingNote: "Adjustable strap.",
  },
  {
    slug: "wax-pocket-keychain",
    name: "WAX POCKET KEYCHAIN",
    category: "accessories",
    priceCents: 1800,
    colors: ["ink", "hazard"],
    sizes: ["One Size"],
    badges: ["NEW"],
    description: "Carabiner keychain with a wax-holder slot. Yes, the wax fits.",
    materials: "Anodized aluminum, leather pull.",
    care: "Wipe clean.",
    sizingNote: "—",
  },
  {
    slug: "newsprint-tote",
    name: "NEWSPRINT TOTE",
    category: "accessories",
    priceCents: 2800,
    colors: ["bone"],
    sizes: ["One Size"],
    description: "Heavy canvas tote with newsprint-pattern screen print. Long handle.",
    materials: "12 oz natural cotton canvas.",
    care: "Cold wash.",
    sizingNote: "Holds a board bag's worth.",
  },
  {
    slug: "sk8-mafia-x-sl-deck-tee",
    name: "SK8 MAFIA × SL TEE",
    category: "tees",
    priceCents: 4800,
    colors: ["ink", "bone"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    edition: "1/300",
    badges: ["NEW"],
    description: "Collab tee with Sk8 Mafia. Limited run, full back graphic, blockletter front.",
    materials: "100% cotton, 230 gsm.",
    care: "Machine wash cold inside-out.",
    sizingNote: "True to size.",
  },
  {
    slug: "bone-cargo-shorts",
    name: "BONE CARGO SHORTS",
    category: "accessories",
    priceCents: 6800,
    colors: ["bone", "ink"],
    sizes: ["S", "M", "L", "XL"],
    description: "Knee-length cargo shorts with twin side pockets. Drawcord waist.",
    materials: "Cotton ripstop.",
    care: "Machine wash cold.",
    sizingNote: "Relaxed through the hip and thigh.",
  },
];

function makeDetail(spec: MockSpec): ProductDetail {
  const primaryColor = spec.colors[0]!;
  const variants = spec.colors.flatMap((c) =>
    spec.sizes.map((sz, i) => ({
      id: `${spec.slug}-${c}-${sz}`,
      sku: `SL-${spec.slug.toUpperCase().replace(/-/g, "")}-${c.toUpperCase()}-${sz.replace(/\s+/g, "")}`,
      color: COLORS[c].name,
      colorHex: COLORS[c].hex,
      size: sz,
      inStock: !(c === "ink" && sz === "XXL" && i % 3 === 0),
      priceCents: spec.priceCents,
      imageUrl: placeholder(`${spec.slug}-${c}`, 1200, 1500),
    })),
  );

  return {
    id: spec.slug,
    slug: spec.slug,
    name: spec.name,
    category: spec.category,
    priceCents: spec.priceCents,
    currency: "USD",
    primaryImage: placeholder(`${spec.slug}-${primaryColor}`, 1200, 1500),
    hoverImage: placeholder(`${spec.slug}-${primaryColor}-alt`, 1200, 1500),
    colors: spec.colors.map((c) => COLORS[c]),
    badges: spec.badges,
    edition: spec.edition,
    description: spec.description,
    whyIMadeThis: spec.whyIMadeThis,
    materials: spec.materials,
    care: spec.care,
    sizingNote: spec.sizingNote,
    gallery: [
      placeholder(`${spec.slug}-${primaryColor}`, 1600, 2000),
      placeholder(`${spec.slug}-detail-1`, 1600, 2000),
      placeholder(`${spec.slug}-onbody`, 1600, 2000),
      placeholder(`${spec.slug}-flat`, 1600, 2000),
    ],
    variants,
  };
}

export const MOCK_PRODUCTS: ProductDetail[] = SPECS.map(makeDetail);

export function getMockSummaries(category?: string): ProductSummary[] {
  const list = category ? MOCK_PRODUCTS.filter((p) => p.category === category) : MOCK_PRODUCTS;
  return list.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    priceCents: p.priceCents,
    currency: p.currency,
    primaryImage: p.primaryImage,
    hoverImage: p.hoverImage,
    colors: p.colors,
    badges: p.badges,
    edition: p.edition,
  }));
}

export function getMockProduct(slug: string): ProductDetail | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug);
}
