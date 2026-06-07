export type Category = "tees" | "hoodies" | "hats" | "accessories";

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  category: Category;
  priceCents: number;
  currency: string;
  primaryImage: string;
  hoverImage?: string;
  colors: { name: string; hex: string }[];
  badges?: ("NEW" | "RESTOCK" | "LOW")[];
  edition?: string;
}

export interface ProductVariantOption {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  inStock: boolean;
  priceCents: number;
  imageUrl: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  whyIMadeThis?: string;
  materials: string;
  care: string;
  sizingNote: string;
  gallery: string[];
  variants: ProductVariantOption[];
}

export interface CartLine {
  variantId: string;
  productSlug: string;
  productName: string;
  color: string;
  size: string;
  unitPriceCents: number;
  imageUrl: string;
  quantity: number;
  printfulSyncVariantId?: number;
}
