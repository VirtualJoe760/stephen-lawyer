import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";
import { MOCK_PRODUCTS } from "@/lib/mock-products";
import { getJournalPosts, getLookbookEntries } from "@/lib/sanity/queries";

const STATIC_PATHS = ["", "/shop", "/lookbook", "/journal", "/about", "/contact", "/faq", "/sizing", "/shipping-returns", "/privacy", "/terms"];
const CATEGORIES = ["tees", "hoodies", "hats", "accessories"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [journal, lookbook] = await Promise.all([getJournalPosts(50), getLookbookEntries()]);
  const now = new Date();

  return [
    ...STATIC_PATHS.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now })),
    ...CATEGORIES.map((c) => ({ url: `${SITE_URL}/shop/${c}`, lastModified: now })),
    ...MOCK_PRODUCTS.map((p) => ({ url: `${SITE_URL}/product/${p.slug}`, lastModified: now })),
    ...journal.map((p) => ({ url: `${SITE_URL}/journal/${p.slug}`, lastModified: new Date(p.publishedAt) })),
    ...lookbook.map((l) => ({ url: `${SITE_URL}/lookbook/${l.slug}`, lastModified: new Date(l.publishedAt) })),
  ];
}
