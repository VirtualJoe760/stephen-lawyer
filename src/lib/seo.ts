import { SITE_URL } from "@/lib/utils";

export const BRAND_NAME = "STEPHEN LAWYER";
export const BRAND_DESCRIPTION =
  "Direct-to-consumer apparel from pro skateboarder Stephen Lawyer.";

// Site-wide Organization schema.
// NOTE: `sameAs` (social profiles) is intentionally omitted until the real
// Instagram/YouTube/TikTok handles are verified — the ones in the codebase are
// unverified placeholders (see CONTENT-INVENTORY.md). Add them here once confirmed.
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    image: `${SITE_URL}/opengraph-image`,
    description: BRAND_DESCRIPTION,
    // sameAs: ["https://instagram.com/...", "https://youtube.com/...", ...],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
