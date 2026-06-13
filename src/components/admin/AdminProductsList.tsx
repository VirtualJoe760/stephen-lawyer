"use client";
import { useEffect, useMemo, useState } from "react";
import { ProductDesignEditor } from "./ProductDesignEditor";

interface Row {
  id: string;
  name: string;
  slug: string;
  category: string;
  isPublished: boolean;
  printfulSyncProductId: string | null;
  image: string | null;
  priceCents: number;
  variantCount: number;
}

type Filter = "all" | "live" | "paused";

export function AdminProductsList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => setRows(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "live" && !r.isPublished) return false;
      if (filter === "paused" && r.isPublished) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, q, filter]);

  const liveCount = rows.filter((r) => r.isPublished).length;

  async function togglePause(r: Row) {
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/products/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !r.isPublished }),
      });
      if (res.ok) setRows((cur) => cur.map((x) => (x.id === r.id ? { ...x, isPublished: !x.isPublished } : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: Row) {
    if (typeof window !== "undefined" && !window.confirm(`Delete "${r.name}" from the store and Printful? This can't be undone.`)) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/products/${r.id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows((cur) => cur.filter((x) => x.id !== r.id));
        if (d.warning) window.alert(d.warning);
      } else {
        window.alert(d.error ?? "Delete failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="mt-8 text-sm text-bone/40">Loading products…</p>;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="flex-1 min-w-40 rounded border border-bone/20 bg-ink px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />
        {(["all", "live", "paused"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded border px-3 py-2 text-[11px] font-mono uppercase tracking-widest ${
              filter === f ? "border-hazard text-bone" : "border-bone/20 text-bone/50 hover:text-bone"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-mono uppercase tracking-widest text-bone/40">
        {rows.length} products · {liveCount} live · {rows.length - liveCount} paused
      </p>

      <div className="mt-4 divide-y divide-bone/10 rounded-md border border-bone/10">
        {shown.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-bone/5">
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-bone">{r.name}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest ${
                    r.isPublished ? "bg-acid/20 text-acid" : "bg-bone/10 text-bone/50"
                  }`}
                >
                  {r.isPublished ? "Live" : "Paused"}
                </span>
              </div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-bone/40">
                {r.category} · ${(r.priceCents / 100).toFixed(2)} · {r.variantCount} variants
              </p>
            </div>
            <a
              href={`/product/${r.slug}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded border border-bone/20 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-bone/60 hover:border-hazard hover:text-bone"
            >
              View ↗
            </a>
            <button
              disabled={busyId === r.id}
              onClick={() => setEditId(r.id)}
              className="shrink-0 rounded border border-bone/20 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone disabled:opacity-40"
            >
              Edit
            </button>
            <button
              disabled={busyId === r.id}
              onClick={() => togglePause(r)}
              className="shrink-0 rounded border border-bone/20 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-bone/70 hover:border-hazard hover:text-bone disabled:opacity-40"
            >
              {r.isPublished ? "Pause" : "Publish"}
            </button>
            <button
              disabled={busyId === r.id}
              onClick={() => remove(r)}
              className="shrink-0 rounded border border-hazard/40 px-2.5 py-1.5 text-[11px] font-mono uppercase tracking-widest text-hazard/80 hover:bg-hazard/10 disabled:opacity-40"
            >
              Delete
            </button>
          </div>
        ))}
        {!shown.length ? <p className="p-4 text-sm text-bone/40">No products match.</p> : null}
      </div>

      {editId ? (
        <ProductDesignEditor
          productId={editId}
          onClose={() => setEditId(null)}
          onSaved={(hero) =>
            setRows((cur) => cur.map((x) => (x.id === editId ? { ...x, image: hero ?? x.image } : x)))
          }
        />
      ) : null}
    </div>
  );
}
