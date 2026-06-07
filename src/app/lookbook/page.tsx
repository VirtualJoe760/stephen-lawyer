import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getLookbookEntries } from "@/lib/sanity/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "Editorial spreads and photo essays from Stephen Lawyer.",
};

export default async function LookbookIndex() {
  const entries = await getLookbookEntries();
  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-[1600px] mx-auto">
        <h1 className="wordmark text-6xl md:text-9xl mb-16">Lookbook</h1>
        <div className="space-y-24">
          {entries.map((entry, i) => (
            <Link
              key={entry._id}
              href={`/lookbook/${entry.slug}`}
              className={`group block grid md:grid-cols-2 gap-4 md:gap-8 ${i % 2 ? "md:[direction:rtl]" : ""}`}
            >
              <div className="relative aspect-[4/5] bg-bone-200 overflow-hidden">
                <Image src={entry.heroImage} alt={entry.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              {entry.images[0] && (
                <div className="relative aspect-[4/5] bg-bone-200 overflow-hidden mt-12 md:mt-24">
                  <Image src={entry.images[0]} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
              )}
              <div className="md:col-span-2 [direction:ltr]">
                <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-1">{formatDate(entry.publishedAt)}</p>
                <h2 className="wordmark text-4xl md:text-6xl group-hover:text-hazard transition-colors">{entry.title}</h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
