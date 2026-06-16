import { brand } from "@/lib/brand";

// All editorial content for the storefront. Journal posts come LIVE from the Nano Crew platform
// (store_posts) — authored in Studio, no rebuild. Ticker / FAQ / about / lookbook are static brand
// content (formerly Sanity, now in-code). This module replaces the Sanity layer entirely — there is
// no CMS dependency. Same exported names/types as before, so pages didn't need restructuring.

// ---------- Static brand content ----------

const TICKER = [
  "NEW DROP FRIDAY 7PM PT",
  "FREE SHIPPING OVER $80",
  "GOING TO BARCELONA NEXT WEEK",
  "MADE ON DEMAND · SHIPPED FROM PRINTFUL",
];

export interface FaqItem { id: string; question: string; answer: string }

const FAQ: FaqItem[] = [
  { id: "shipping", question: "How long does shipping take?", answer: "Everything is made-to-order by Printful. Production takes 2–5 business days, then shipping is 3–7 business days inside the US and 7–20 internationally." },
  { id: "sizing", question: "How does the fit run?", answer: "Tees and hoodies fit slightly oversized — true to size for a relaxed fit, size down if you want it fitted. Check the sizing chart on the product page." },
  { id: "returns", question: "Can I return something?", answer: "Because everything is print-on-demand, returns are limited to damaged or misprinted items. Email contact@stephenlawyer.clothing within 14 days of delivery with photos." },
  { id: "custom", question: "Can I get something custom?", answer: "Not yet. We're not taking one-off custom orders for v1. Sign up for the newsletter and we'll let you know when that opens." },
];

const ABOUT = {
  headline: "STEPHEN LAWYER",
  body:
    "Pro skater out of Encinitas, California. Sk8 Mafia for life. Spitfire on the wheels, Thunder under the deck, HUF on the feet. Filmed parts since 2014, video parts for Sk8 Mafia, Thrasher, and Spitfire. Known for technical ledge skating and a fit that doesn't apologize.\n\nThis site is the merch. Made on demand, shipped worldwide, designed by me with the friends I trust. No corporate hand-holding, no marketing department. If you buy something, thank you — it goes to the next video, the next trip, the next thing.",
};

export interface LookbookEntry { _id: string; title: string; slug: string; intro: string; publishedAt: string; heroImage: string; images: string[] }

const LOOKBOOK: LookbookEntry[] = [
  { _id: "1", title: "Summer 26 / Hazard", slug: "summer-26-hazard", intro: "Loud colors, louder pads. Shot over four days in Encinitas and downtown LA.", publishedAt: "2026-05-01", heroImage: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=1800&q=85", images: ["https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1400&q=85", "https://images.unsplash.com/photo-1502810190503-8303352d0dd1?w=1400&q=85", "https://images.unsplash.com/photo-1580130544577-e6ac2974f9b3?w=1400&q=85"] },
  { _id: "2", title: "Winter 25 / Spitfire", slug: "winter-25-spitfire", intro: "On tour with the Spitfire team. Mexico, Spain, the back room at a Madrid skate shop.", publishedAt: "2025-12-12", heroImage: "https://images.unsplash.com/photo-1531565637446-32307b194362?w=1800&q=85", images: ["https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=1400&q=85", "https://images.unsplash.com/photo-1502810190503-8303352d0dd1?w=1400&q=85"] },
];

export async function getTickerItems(): Promise<string[]> { return TICKER; }
export async function getFaqs(): Promise<FaqItem[]> { return FAQ; }
export async function getAboutContent(): Promise<{ headline: string; body: string }> { return ABOUT; }
export async function getLookbookEntries(): Promise<LookbookEntry[]> { return LOOKBOOK; }
export async function getLookbookEntry(slug: string): Promise<LookbookEntry | null> {
  return LOOKBOOK.find((l) => l.slug === slug) ?? null;
}

// ---------- Journal — LIVE from the Nano Crew platform (store_posts) ----------

export interface JournalPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  coverImage?: string;
  readMinutes?: number;
  body?: string; // markdown
}

type ApiPost = { slug: string; title: string; excerpt: string | null; coverImageUrl?: string | null; bodyMd?: string; publishedAt: string | null };

async function fromApi<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${brand.apiBase}${path}`, { next: { revalidate: 120 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function mapPost(p: ApiPost): JournalPost {
  const words = (p.bodyMd ?? "").trim().split(/\s+/).filter(Boolean).length;
  return {
    _id: p.slug,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    publishedAt: p.publishedAt ?? "",
    coverImage: p.coverImageUrl ?? undefined,
    readMinutes: words ? Math.max(1, Math.round(words / 200)) : undefined,
    body: p.bodyMd,
  };
}

export async function getJournalPosts(limit = 10): Promise<JournalPost[]> {
  const live = await fromApi<{ posts: ApiPost[] }>(`/api/public/stores/${brand.slug}/posts`);
  return (live?.posts ?? []).slice(0, limit).map(mapPost);
}

export async function getJournalPost(slug: string): Promise<JournalPost | null> {
  const live = await fromApi<{ post: ApiPost }>(`/api/public/stores/${brand.slug}/posts/${slug}`);
  if (live?.post) return mapPost(live.post);
  // fall back to the list (covers APIs that only expose the collection)
  const all = await getJournalPosts(50);
  return all.find((p) => p.slug === slug) ?? null;
}
