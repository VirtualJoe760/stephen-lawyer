import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { getStoreSummaries } from "@/lib/db-products";
import { getJournalPosts, getLookbookEntries } from "@/lib/content";
import { formatDate } from "@/lib/utils";
import { NewsletterForm } from "@/components/newsletter-form";

export default async function Home() {
  const [products, journal, lookbook] = await Promise.all([
    getStoreSummaries(),
    getJournalPosts(3),
    getLookbookEntries(),
  ]);
  const featured = products.slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative w-full" style={{ height: "min(80vh, 720px)" }}>
        <Image
          src="/hero.png"
          alt="Stephen Lawyer grinding a rail"
          priority
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
        <div className="absolute inset-0 px-4 md:px-8 flex flex-col justify-end pb-12 md:pb-20">
          <div className="max-w-[1600px] mx-auto w-full">
            <p className="font-mono text-xs uppercase tracking-widest text-bone mb-3 inline-block bg-ink px-2 py-1">
              Summer 26 — out now
            </p>
            <h1
              className="wordmark text-bone text-[14vw] md:text-[10vw] leading-[0.85] mb-6"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
            >
              STEPHEN<br />LAWYER
            </h1>
            <Link href="/shop">
              <Button size="lg" variant="primary" className="inline-flex">
                Shop the drop →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured drop */}
      <section className="px-4 md:px-8 py-20">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-10 gap-4">
            <h2 className="wordmark text-5xl md:text-7xl">Latest Drop</h2>
            <Link href="/shop" className="font-mono text-xs uppercase tracking-widest hover:text-hazard">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Lookbook teaser */}
      <section className="px-4 md:px-8 py-20 bg-ink text-bone">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid md:grid-cols-2 gap-2 md:gap-6 mb-10">
            {lookbook.slice(0, 2).map((entry) => (
              <Link key={entry._id} href={`/lookbook/${entry.slug}`} className="group block">
                <div className="relative aspect-[4/5] bg-ink-soft overflow-hidden">
                  <Image
                    src={entry.heroImage}
                    alt={entry.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-3 wordmark text-2xl md:text-3xl">{entry.title}</h3>
              </Link>
            ))}
          </div>
          <div className="flex items-end justify-between gap-4">
            <p className="max-w-md text-sm md:text-base text-bone/70 leading-relaxed">
              Editorial spreads, tour photos, board-snap montages. The visual record of what we're up to between drops.
            </p>
            <Link
              href="/lookbook"
              className="font-mono text-xs uppercase tracking-widest hover:text-hazard whitespace-nowrap"
            >
              View lookbook →
            </Link>
          </div>
        </div>
      </section>

      {/* Journal teaser */}
      <section className="px-4 md:px-8 py-20">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-end justify-between mb-10 gap-4">
            <h2 className="wordmark text-5xl md:text-7xl">Journal</h2>
            <Link href="/journal" className="font-mono text-xs uppercase tracking-widest hover:text-hazard">
              See all →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {journal.map((post) => (
              <Link key={post._id} href={`/journal/${post.slug}`} className="group block">
                <div className="relative aspect-[4/3] bg-bone-200 overflow-hidden mb-4">
                  {post.coverImage && (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60">
                  {formatDate(post.publishedAt)}
                  {post.readMinutes ? ` · ${post.readMinutes} min` : ""}
                </p>
                <h3 className="wordmark text-2xl mt-1 group-hover:text-hazard transition-colors">{post.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="px-4 md:px-8 py-24 bg-bone-200 relative overflow-hidden">
        <div className="absolute inset-0 newsprint opacity-50" />
        <div className="max-w-2xl mx-auto relative">
          <p className="font-mono text-xs uppercase tracking-widest text-ink mb-3">// signal</p>
          <h2 className="wordmark text-5xl md:text-7xl leading-[0.85] mb-2">Get the drop</h2>
          <h2 className="wordmark text-5xl md:text-7xl leading-[0.85] mb-8 -rotate-1 inline-block bg-hazard text-ink px-2">
            Before it's gone
          </h2>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
