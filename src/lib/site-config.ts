import { cache } from "react";

import { brand } from "@/lib/brand";

// The mini-CMS live-read. A creator edits colors (and later copy/fonts) in Studio's "✦ Customize";
// those land in stores.site_config and are served by /api/public/stores/:slug/site-config. We fetch
// them and layer over the baked brand.json palette — no rebuild. Mirrors the Nano Crew template's
// lib/site-config.ts so this site behaves like a template.

export type SiteConfig = {
  copy?: Record<string, string>;
  colors?: Record<string, string>;
  fonts?: { display?: string; body?: string };
};

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  try {
    const res = await fetch(`${brand.apiBase}/api/public/stores/${brand.slug}/site-config`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    return (await res.json()) as SiteConfig;
  } catch {
    return {};
  }
});

/** Live color overrides merged over the baked palette → injected as CSS vars by the layout. */
export async function getBrandColors() {
  const live = (await getSiteConfig()).colors ?? {};
  return {
    background: live.background || brand.palette.background,
    text: live.text || brand.palette.text,
    primary: live.primary || brand.palette.primary,
    accent: live.accent || brand.palette.accent,
  };
}
