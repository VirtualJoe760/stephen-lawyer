import type { Metadata } from "next";
import Image from "next/image";
import { getAboutContent } from "@/lib/sanity/queries";

export const metadata: Metadata = {
  title: "About",
  description: "Stephen Lawyer — pro skater out of Encinitas. About the brand, the story, and the people who make it.",
};

const SPONSORS = [
  { name: "Sk8 Mafia", url: "https://sk8mafia.com" },
  { name: "Spitfire", url: "https://spitfirewheels.com" },
  { name: "Thunder", url: "https://thundertrucks.com" },
  { name: "HUF", url: "https://hufworldwide.com" },
];

export default async function About() {
  const { headline, body } = await getAboutContent();
  return (
    <article className="px-4 md:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="wordmark text-6xl md:text-9xl leading-[0.85] mb-12">{headline}</h1>

        <div className="relative aspect-[16/10] bg-bone-200 mb-12">
          <Image src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=2000&q=85" alt="" fill sizes="(min-width: 1024px) 768px, 100vw" className="object-cover" />
        </div>

        <div className="text-lg leading-relaxed space-y-6 whitespace-pre-line">
          {body}
        </div>

        <div className="mt-16 pt-8 border-t-2 border-ink">
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-4">Sponsors</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm uppercase tracking-widest">
            {SPONSORS.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-hazard">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
