import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLookbookEntry, getLookbookEntries } from "@/lib/content";
import { ProductCard } from "@/components/product/product-card";
import { getStoreSummaries } from "@/lib/db-products";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getLookbookEntry(slug);
  if (!entry) return {};
  return {
    title: entry.title,
    description: entry.intro,
    openGraph: { images: [entry.heroImage] },
  };
}

export async function generateStaticParams() {
  const entries = await getLookbookEntries();
  return entries.map((e) => ({ slug: e.slug }));
}

export default async function LookbookEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = await getLookbookEntry(slug);
  if (!entry) notFound();
  const related = (await getStoreSummaries()).slice(0, 4);

  return (
    <article className="pb-20">
      <div className="relative w-full h-[80vh] max-h-[900px]">
        <Image src={entry.heroImage} alt={entry.title} fill priority sizes="100vw" className="object-cover" />
      </div>

      <div className="px-4 md:px-8 mt-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/lookbook" className="font-mono text-xs uppercase tracking-widest text-ink/60 hover:text-hazard">
            ← Lookbook
          </Link>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ink/60">{formatDate(entry.publishedAt)}</p>
          <h1 className="wordmark text-5xl md:text-7xl mt-2 mb-6">{entry.title}</h1>
          <p className="text-lg leading-relaxed">{entry.intro}</p>
        </div>
      </div>

      <div className="px-4 md:px-8 mt-16">
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-12 gap-4 md:gap-8">
          {entry.images.map((img, i) => {
            const layouts = [
              "md:col-span-8 aspect-[4/5]",
              "md:col-span-4 md:mt-24 aspect-[3/4]",
              "md:col-span-12 aspect-[16/9]",
              "md:col-span-5 aspect-[3/4]",
              "md:col-span-7 md:mt-32 aspect-[4/5]",
            ];
            return (
              <div key={img} className={`relative bg-bone-200 ${layouts[i % layouts.length]}`}>
                <Image src={img} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            );
          })}
        </div>
      </div>

      <section className="px-4 md:px-8 mt-24">
        <div className="max-w-[1600px] mx-auto">
          <h2 className="wordmark text-4xl md:text-5xl mb-8">Shop this lookbook</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>
    </article>
  );
}
