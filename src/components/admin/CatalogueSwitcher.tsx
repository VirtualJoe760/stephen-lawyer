"use client";
import { useRouter } from "next/navigation";
import type { CatalogueRow } from "./DesignerCanvas";

export function CatalogueSwitcher({
  current,
  catalogues,
}: {
  current: CatalogueRow;
  catalogues: CatalogueRow[];
}) {
  const router = useRouter();
  return (
    <select
      value={current.slug}
      onChange={(e) => {
        if (e.target.value === "__manage") router.push("/admin/designer");
        else router.push(`/admin/designer/${e.target.value}`);
      }}
      className="shrink-0 rounded border border-bone/20 bg-ink-soft px-2 py-1 text-xs font-mono uppercase tracking-wide text-bone"
    >
      {catalogues.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
      <option value="__manage">+ New / switch…</option>
    </select>
  );
}
