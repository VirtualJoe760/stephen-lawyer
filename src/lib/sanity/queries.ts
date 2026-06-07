import { sanity } from "@/lib/sanity/client";

const FALLBACK_TICKER = [
  "NEW DROP FRIDAY 7PM PT",
  "FREE SHIPPING OVER $80",
  "GOING TO BARCELONA NEXT WEEK",
  "MADE ON DEMAND · SHIPPED FROM PRINTFUL",
];

const FALLBACK_FAQ = [
  {
    id: "shipping",
    question: "How long does shipping take?",
    answer:
      "Everything is made-to-order by Printful. Production takes 2–5 business days, then shipping is 3–7 business days inside the US and 7–20 internationally.",
  },
  {
    id: "sizing",
    question: "How does the fit run?",
    answer:
      "Tees and hoodies fit slightly oversized — true to size for a relaxed fit, size down if you want it fitted. Check the sizing chart on the product page.",
  },
  {
    id: "returns",
    question: "Can I return something?",
    answer:
      "Because everything is print-on-demand, returns are limited to damaged or misprinted items. Email contact@stephenlawyer.com within 14 days of delivery with photos.",
  },
  {
    id: "custom",
    question: "Can I get something custom?",
    answer:
      "Not yet. We're not taking one-off custom orders for v1. Sign up for the newsletter and we'll let you know when that opens.",
  },
];

export async function getTickerItems(): Promise<string[]> {
  if (!sanity) return FALLBACK_TICKER;
  try {
    const data = await sanity.fetch<{ items: string[] } | null>(
      `*[_type == "ticker"][0]{ items }`,
      {},
      { next: { revalidate: 60 } },
    );
    return data?.items?.length ? data.items : FALLBACK_TICKER;
  } catch {
    return FALLBACK_TICKER;
  }
}

export interface JournalPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  coverImage?: string;
  readMinutes?: number;
  body?: unknown;
}

const FALLBACK_JOURNAL: JournalPost[] = [
  {
    _id: "1",
    title: "Three Months in Encinitas",
    slug: "three-months-in-encinitas",
    excerpt: "Came home for the winter, ended up shooting the part I've been trying to film for two years. Notes on the spots, the crew, and the bail montage that almost happened.",
    publishedAt: "2026-05-12",
    readMinutes: 6,
    coverImage: "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1600&q=80",
  },
  {
    _id: "2",
    title: "Why the Tri-Color Camo",
    slug: "why-the-tri-color-camo",
    excerpt: "Short answer: snow gear ate my brain in 2018 and never gave it back. Long answer below.",
    publishedAt: "2026-04-03",
    readMinutes: 3,
    coverImage: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=80",
  },
  {
    _id: "3",
    title: "Spitfire Tour Recap — Mexico City",
    slug: "spitfire-mexico-city",
    excerpt: "Five days, four sessions, one ledge that nearly killed me. Photos by Atiba.",
    publishedAt: "2026-03-14",
    readMinutes: 8,
    coverImage: "https://images.unsplash.com/photo-1531565637446-32307b194362?w=1600&q=80",
  },
];

export async function getJournalPosts(limit = 10): Promise<JournalPost[]> {
  if (!sanity) return FALLBACK_JOURNAL.slice(0, limit);
  try {
    const data = await sanity.fetch<JournalPost[]>(
      `*[_type == "post"] | order(publishedAt desc)[0...$limit]{
        _id, title, "slug": slug.current, excerpt, publishedAt, readMinutes,
        "coverImage": coverImage.asset->url
      }`,
      { limit },
      { next: { revalidate: 60 } },
    );
    return data.length ? data : FALLBACK_JOURNAL.slice(0, limit);
  } catch {
    return FALLBACK_JOURNAL.slice(0, limit);
  }
}

export async function getJournalPost(slug: string): Promise<JournalPost | null> {
  if (!sanity) return FALLBACK_JOURNAL.find((p) => p.slug === slug) ?? null;
  try {
    return await sanity.fetch<JournalPost | null>(
      `*[_type == "post" && slug.current == $slug][0]{
        _id, title, "slug": slug.current, excerpt, publishedAt, readMinutes,
        "coverImage": coverImage.asset->url, body
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );
  } catch {
    return FALLBACK_JOURNAL.find((p) => p.slug === slug) ?? null;
  }
}

export interface LookbookEntry {
  _id: string;
  title: string;
  slug: string;
  intro: string;
  publishedAt: string;
  heroImage: string;
  images: string[];
}

const FALLBACK_LOOKBOOK: LookbookEntry[] = [
  {
    _id: "1",
    title: "Summer 26 / Hazard",
    slug: "summer-26-hazard",
    intro: "Loud colors, louder pads. Shot over four days in Encinitas and downtown LA.",
    publishedAt: "2026-05-01",
    heroImage: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=1800&q=85",
    images: [
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1400&q=85",
      "https://images.unsplash.com/photo-1502810190503-8303352d0dd1?w=1400&q=85",
      "https://images.unsplash.com/photo-1580130544577-e6ac2974f9b3?w=1400&q=85",
    ],
  },
  {
    _id: "2",
    title: "Winter 25 / Spitfire",
    slug: "winter-25-spitfire",
    intro: "On tour with the Spitfire team. Mexico, Spain, the back room at a Madrid skate shop.",
    publishedAt: "2025-12-12",
    heroImage: "https://images.unsplash.com/photo-1531565637446-32307b194362?w=1800&q=85",
    images: [
      "https://images.unsplash.com/photo-1518929458119-e5bf444c30f4?w=1400&q=85",
      "https://images.unsplash.com/photo-1502810190503-8303352d0dd1?w=1400&q=85",
    ],
  },
];

export async function getLookbookEntries(): Promise<LookbookEntry[]> {
  if (!sanity) return FALLBACK_LOOKBOOK;
  try {
    const data = await sanity.fetch<LookbookEntry[]>(
      `*[_type == "lookbook"] | order(publishedAt desc){
        _id, title, "slug": slug.current, intro, publishedAt,
        "heroImage": heroImage.asset->url,
        "images": images[].asset->url
      }`,
      {},
      { next: { revalidate: 60 } },
    );
    return data.length ? data : FALLBACK_LOOKBOOK;
  } catch {
    return FALLBACK_LOOKBOOK;
  }
}

export async function getLookbookEntry(slug: string): Promise<LookbookEntry | null> {
  if (!sanity) return FALLBACK_LOOKBOOK.find((l) => l.slug === slug) ?? null;
  try {
    return await sanity.fetch<LookbookEntry | null>(
      `*[_type == "lookbook" && slug.current == $slug][0]{
        _id, title, "slug": slug.current, intro, publishedAt,
        "heroImage": heroImage.asset->url,
        "images": images[].asset->url
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );
  } catch {
    return FALLBACK_LOOKBOOK.find((l) => l.slug === slug) ?? null;
  }
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export async function getFaqs(): Promise<FaqItem[]> {
  if (!sanity) return FALLBACK_FAQ;
  try {
    const data = await sanity.fetch<FaqItem[]>(
      `*[_type == "faq"] | order(orderRank asc){ "id": _id, question, answer }`,
      {},
      { next: { revalidate: 60 } },
    );
    return data.length ? data : FALLBACK_FAQ;
  } catch {
    return FALLBACK_FAQ;
  }
}

export async function getAboutContent(): Promise<{ headline: string; body: string }> {
  const fallback = {
    headline: "STEPHEN LAWYER",
    body:
      "Pro skater out of Encinitas, California. Sk8 Mafia for life. Spitfire on the wheels, Thunder under the deck, HUF on the feet. Filmed parts since 2014, video parts for Sk8 Mafia, Thrasher, and Spitfire. Known for technical ledge skating and a fit that doesn't apologize.\n\nThis site is the merch. Made on demand, shipped worldwide, designed by me with the friends I trust. No corporate hand-holding, no marketing department. If you buy something, thank you — it goes to the next video, the next trip, the next thing.",
  };
  if (!sanity) return fallback;
  try {
    const data = await sanity.fetch<{ headline: string; body: string } | null>(
      `*[_type == "aboutPage"][0]{ headline, body }`,
      {},
      { next: { revalidate: 60 } },
    );
    return data ?? fallback;
  } catch {
    return fallback;
  }
}
