import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";
import { MOCK_PRODUCTS } from "@/lib/mock-products";
import { getJournalPosts, getLookbookEntries } from "@/lib/sanity/queries";

type Entry = MetadataRoute.Sitemap[number];

// Static paths grouped by SEO priority / expected change cadence.
const PRIMARY = ["", "/shop"];
const SECONDARY = ["/lookbook", "/journal", "/about"];
const SUPPORT = ["/contact", "/faq", "/sizing", "/shipping-returns"];
const LEGAL = ["/privacy", "/terms"];
const CATEGORIES = ["tees", "hoodies", "hats", "accessories"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [journal, lookbook] = await Promise.all([getJournalPosts(50), getLookbookEntries()]);
  const now = new Date();

  const entries: Entry[] = [
    ...PRIMARY.map((p) => ({
      url: `${SITE_URL}${p || "/"}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: p === "" ? 1 : 0.9,
    })),
    ...CATEGORIES.map((c) => ({
      url: `${SITE_URL}/shop/${c}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...MOCK_PRODUCTS.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...SECONDARY.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...journal.map((p) => ({
      url: `${SITE_URL}/journal/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...lookbook.map((l) => ({
      url: `${SITE_URL}/lookbook/${l.slug}`,
      lastModified: new Date(l.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...SUPPORT.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    ...LEGAL.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];

  return entries;
}
