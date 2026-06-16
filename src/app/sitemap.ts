import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";
import { getStoreSummaries } from "@/lib/db-products";
import { getJournalPosts, getLookbookEntries } from "@/lib/content";

type Entry = MetadataRoute.Sitemap[number];

// Static paths grouped by SEO priority / expected change cadence.
const PRIMARY = ["", "/shop"];
const SECONDARY = ["/lookbook", "/journal", "/about"];
const SUPPORT = ["/contact", "/faq", "/sizing", "/shipping-returns"];
const LEGAL = ["/privacy", "/terms"];
const CATEGORIES = ["tees", "hoodies", "hats", "accessories"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, journal, lookbook] = await Promise.all([
    getStoreSummaries(),
    getJournalPosts(50),
    getLookbookEntries(),
  ]);
  const now = new Date();
  // Lookbook entries are app-driven and carry no date; some journal dates can be empty too — fall
  // back to `now` so the sitemap never throws on an invalid Date.
  const when = (s: string) => {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? now : d;
  };

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
    ...products.map((p) => ({
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
      lastModified: when(p.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...lookbook.map((l) => ({
      url: `${SITE_URL}/lookbook/${l.slug}`,
      lastModified: when(l.publishedAt),
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
