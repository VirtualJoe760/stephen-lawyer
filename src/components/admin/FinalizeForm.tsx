"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FinalizeVariant {
  id: number;
  name: string;
  size: string;
  color: string;
  priceCents: number; // Printful base cost
}

interface Props {
  compositionId: string;
  previewUrl: string | null;
  templateName: string;
  placements: string[];
  defaultPlacement: string;
  variants: FinalizeVariant[];
  variantsError: string | null;
}

const MARKUP = 2; // default retail = 2× Printful base cost

export function FinalizeForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState(props.defaultPlacement);
  const [rows, setRows] = useState<Record<number, { on: boolean; priceCents: number }>>(() => {
    const m: Record<number, { on: boolean; priceCents: number }> = {};
    for (const v of props.variants) m[v.id] = { on: true, priceCents: v.priceCents * MARKUP };
    return m;
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function publish() {
    setErr(null);
    if (!name.trim()) {
      setErr("Product name is required");
      return;
    }
    const variants = Object.entries(rows)
      .filter(([, s]) => s.on)
      .map(([id, s]) => ({ printfulVariantId: Number(id), retailPriceCents: s.priceCents }));
    if (!variants.length) {
      setErr("Select at least one variant");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/compositions/${props.compositionId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          placement,
          variants,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; warning?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Publish failed");
        return;
      }
      if (data.warning) window.alert(data.warning);
      router.push("/shop");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-bone">
      <p className="font-mono text-xs uppercase tracking-widest text-hazard">Finalize &amp; publish</p>
      <h1 className="mt-2 font-display text-3xl uppercase leading-none">{props.templateName}</h1>

      {props.previewUrl ? (
        <div className="mt-4 w-48 overflow-hidden rounded border border-bone/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={props.previewUrl} alt="composite" className="w-full" />
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">Product name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-bone/20 bg-ink px-3 py-2 text-sm focus:border-hazard focus:outline-none"
            placeholder="Hazard Camo Tee"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">
            Description (markdown, optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded border border-bone/20 bg-ink px-3 py-2 text-sm focus:border-hazard focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">Placement</label>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            className="mt-1 rounded border border-bone/20 bg-ink px-3 py-2 text-sm focus:border-hazard focus:outline-none"
          >
            {props.placements.map((p) => (
              <option key={p} value={p}>
                {p.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">Variants</label>
          {props.variants.length ? (
            <div className="mt-2 divide-y divide-bone/10 rounded border border-bone/15">
              {props.variants.map((v) => {
                const row = rows[v.id];
                return (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.on}
                      onChange={(e) => setRows((r) => ({ ...r, [v.id]: { ...r[v.id], on: e.target.checked } }))}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {v.color} / {v.size}
                      <span className="ml-2 text-bone/40">base ${(v.priceCents / 100).toFixed(2)}</span>
                    </span>
                    <span className="text-bone/40">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={(row.priceCents / 100).toFixed(2)}
                      onChange={(e) =>
                        setRows((r) => ({
                          ...r,
                          [v.id]: { ...r[v.id], priceCents: Math.round((Number(e.target.value) || 0) * 100) },
                        }))
                      }
                      className="w-20 rounded border border-bone/20 bg-ink px-2 py-1 text-right focus:border-hazard focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 rounded border border-hazard/40 bg-hazard/10 px-3 py-2 text-xs text-hazard">
              {props.variantsError ??
                "No variants available. Set this template's Printful variant IDs (templates.ts) to enable publishing."}
            </p>
          )}
        </div>

        {err ? <p className="text-sm text-hazard">{err}</p> : null}

        <button
          onClick={publish}
          disabled={busy || !props.variants.length}
          className="w-full rounded bg-hazard px-4 py-3 text-sm font-bold uppercase tracking-widest text-bone disabled:opacity-50"
        >
          {busy ? "Publishing…" : "Publish to Printful"}
        </button>
      </div>
    </div>
  );
}
