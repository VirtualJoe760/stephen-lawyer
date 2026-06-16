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

export async function getTickerItems(): Promise<string[]> { return TICKER; }
export async function getFaqs(): Promise<FaqItem[]> { return FAQ; }
export async function getAboutContent(): Promise<{ headline: string; body: string }> { return ABOUT; }

// The lookbook is DRIVEN BY THE APP (no static/stock imagery). Each active collection with published
// products becomes a lookbook entry: hero = the collection cover set in Studio, else a product shot
// from that collection; the spread is that collection's product imagery (on-model shots preferred).
// Assign a collection cover or product model shots in the app and the lookbook updates with no code
// change. An entry only appears once it has at least one real image — so there's nothing to show
// until the catalogue has imagery, but it's never a placeholder.
type ApiCollection = { slug: string; name: string; season: string | null; coverImageUrl: string | null; count: number };
type ApiProductLite = { slug: string; imageUrl: string | null; modelShots?: string[] | null; collection?: { slug: string; name: string } | null };

async function buildLookbook(): Promise<LookbookEntry[]> {
  const [colsRes, prodsRes] = await Promise.all([
    fromApi<{ collections: ApiCollection[] }>(`/api/public/stores/${brand.slug}/collections`),
    fromApi<{ products: ApiProductLite[] }>(`/api/public/stores/${brand.slug}/products`),
  ]);
  const cols = colsRes?.collections ?? [];
  const prods = prodsRes?.products ?? [];
  return cols
    .map((c) => {
      const inCol = prods.filter((p) => p.collection?.slug === c.slug);
      const shots = inCol
        .flatMap((p) => [...(p.modelShots ?? []), p.imageUrl])
        .filter((x): x is string => Boolean(x));
      const hero = c.coverImageUrl ?? shots[0] ?? "";
      return {
        _id: c.slug,
        title: c.name,
        slug: c.slug,
        intro: c.season ? c.season : `${c.count} piece${c.count === 1 ? "" : "s"} in the drop.`,
        publishedAt: "",
        heroImage: hero,
        images: shots.filter((s) => s !== hero).slice(0, 4),
      };
    })
    .filter((e) => e.heroImage);
}

export async function getLookbookEntries(): Promise<LookbookEntry[]> { return buildLookbook(); }
export async function getLookbookEntry(slug: string): Promise<LookbookEntry | null> {
  return (await buildLookbook()).find((l) => l.slug === slug) ?? null;
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
