import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getJournalPosts } from "@/lib/content";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Journal",
  description: "Notes, tour recaps, photo essays, and behind-the-scenes from Stephen Lawyer.",
};

export default async function JournalIndex() {
  const posts = await getJournalPosts(20);
  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="wordmark text-6xl md:text-9xl mb-16">Journal</h1>
        <ul className="divide-y-2 divide-ink">
          {posts.map((post) => (
            <li key={post._id}>
              <Link href={`/journal/${post.slug}`} className="group block py-8 grid md:grid-cols-[200px_1fr] gap-6 items-start">
                {post.coverImage && (
                  <div className="relative aspect-[4/3] bg-bone-200 overflow-hidden">
                    <Image src={post.coverImage} alt={post.title} fill sizes="200px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  </div>
                )}
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-2">
                    {formatDate(post.publishedAt)}{post.readMinutes ? ` · ${post.readMinutes} min` : ""}
                  </p>
                  <h2 className="wordmark text-3xl md:text-4xl group-hover:text-hazard transition-colors">{post.title}</h2>
                  <p className="mt-3 text-base leading-relaxed text-ink/80 max-w-prose">{post.excerpt}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
