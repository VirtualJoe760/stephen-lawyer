import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown, { type Components } from "react-markdown";
import { getJournalPost, getJournalPosts } from "@/lib/content";
import { formatDate, SITE_URL } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { type: "article", title: post.title, description: post.excerpt, images: post.coverImage ? [post.coverImage] : undefined },
    alternates: { canonical: `${SITE_URL}/journal/${slug}` },
  };
}

export async function generateStaticParams() {
  const posts = await getJournalPosts(50);
  return posts.map((p) => ({ slug: p.slug }));
}

// Markdown rendering for journal posts (bodies come from the Nano Crew platform as markdown).
const components: Components = {
  h2: ({ children }) => <h2 className="wordmark text-3xl md:text-4xl mt-12 mb-4">{children}</h2>,
  h3: ({ children }) => <h3 className="wordmark text-2xl mt-8 mb-3">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-hazard pl-6 my-8 text-2xl font-display uppercase leading-snug">
      {children}
    </blockquote>
  ),
  p: ({ children }) => <p className="text-base leading-relaxed mb-4">{children}</p>,
  a: ({ href, children }) => <a href={href} className="underline hover:text-hazard">{children}</a>,
  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
};

export default async function JournalPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.coverImage,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: "Stephen Lawyer" },
  };

  return (
    <article className="pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {post.coverImage && (
        <div className="relative w-full h-[60vh] max-h-[700px]">
          <Image src={post.coverImage} alt={post.title} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}
      <div className="px-4 md:px-8 mt-12">
        <div className="max-w-2xl mx-auto">
          <Link href="/journal" className="font-mono text-xs uppercase tracking-widest text-ink/60 hover:text-hazard">
            ← Journal
          </Link>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ink/60">
            {formatDate(post.publishedAt)}{post.readMinutes ? ` · ${post.readMinutes} min` : ""}
          </p>
          <h1 className="wordmark text-5xl md:text-7xl leading-[0.85] mt-2 mb-8">{post.title}</h1>
          {post.excerpt && <p className="text-xl leading-snug mb-10 text-ink/80">{post.excerpt}</p>}
          {post.body ? (
            <div className="prose-stephen">
              <ReactMarkdown components={components}>{post.body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-base leading-relaxed text-ink/70">
              Full post coming soon.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
