import raw from "@/brand.json";

// The token contract between the Nano Crew platform and this storefront. This is the SINGLE source
// of config — slug, the platform apiBase, Supabase keys, fees. The site reads everything else
// (products, posts, site-config) from the platform via this. No other file reads process.env.
// (Mirrors nanocrew-templates/templates/*/lib/brand.ts so this site behaves like a template.)

export type Brand = {
  storeId: string;
  slug: string;
  name: string;
  tagline: string;
  logoUrl: string;
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  typography: { display: string; body: string };
  designStyle: string;
  voice: string;
  story: string;
  vibeKeywords: string[];
  products: string[];
  social: Record<string, string>;
  apiBase: string;
  platform: { supabaseUrl: string; supabaseAnonKey: string };
  commerce?: { feeWaiveCents: number; feePct: number };
};

export const brand = raw as Brand;
