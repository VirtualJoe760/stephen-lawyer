import Link from "next/link";
import { db } from "@/lib/db";
import { catalogues } from "@/db/schema";
import { asc } from "drizzle-orm";

// Shared server component: lists catalogues as links into the designer.
export async function CatalogueList() {
  const rows = await db
    .select()
    .from(catalogues)
    .orderBy(asc(catalogues.sortOrder), asc(catalogues.createdAt));

  if (!rows.length) {
    return <p className="mt-6 text-bone/50">No catalogues yet. Create your first below.</p>;
  }

  return (
    <ul className="mt-6 divide-y divide-bone/10 border-y border-bone/10">
      {rows.map((c) => (
        <li key={c.id}>
          <Link
            href={`/admin/designer/${c.slug}`}
            className="flex items-center justify-between py-3 transition-colors hover:text-hazard"
          >
            <span className="font-mono uppercase tracking-wide">{c.name}</span>
            <span className="text-bone/40">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
