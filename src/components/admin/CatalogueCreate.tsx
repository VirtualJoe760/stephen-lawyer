"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CatalogueCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n || pending) return;
    setPending(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/catalogues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const data = (await res.json().catch(() => ({}))) as { catalogue?: { slug: string }; error?: string };
      if (!res.ok || !data.catalogue) {
        setErr(data.error ?? "Failed to create catalogue");
        return;
      }
      router.push(`/admin/designer/${data.catalogue.slug}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-md border border-bone/15 bg-ink-soft p-4">
      <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">
        New catalogue
      </label>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
          placeholder="Summer 2026"
          className="flex-1 rounded border border-bone/20 bg-ink px-3 py-2 text-sm text-bone placeholder:text-bone/30 focus:border-hazard focus:outline-none"
        />
        <button
          onClick={create}
          disabled={pending}
          className="rounded bg-hazard px-4 py-2 text-xs font-bold uppercase tracking-widest text-bone disabled:opacity-50"
        >
          {pending ? "…" : "Create"}
        </button>
      </div>
      {err ? <p className="mt-2 text-xs text-hazard">{err}</p> : null}
    </div>
  );
}
