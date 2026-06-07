"use client";
import { useMemo, useState } from "react";
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

export function FinalizeForm(props: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [placement, setPlacement] = useState(props.defaultPlacement || props.placements[0] || "front");

  // Group variants by color so large products (hundreds of variants) stay usable.
  const colorGroups = useMemo(() => {
    const m = new Map<string, FinalizeVariant[]>();
    for (const v of props.variants) {
      const key = v.color || "Default";
      const arr = m.get(key);
      if (arr) arr.push(v);
      else m.set(key, [v]);
    }
    return [...m.entries()].map(([color, vs]) => ({ color, vs }));
  }, [props.variants]);

  const maxBaseCents = useMemo(
    () => props.variants.reduce((m, v) => Math.max(m, v.priceCents), 0),
    [props.variants],
  );
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  // Single retail price applied to all selected variants (default ~2x base).
  const [priceCents, setPriceCents] = useState<number>(() => (maxBaseCents ? maxBaseCents * 2 : 2999));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedVariants = useMemo(
    () => props.variants.filter((v) => selectedColors.has(v.color || "Default")),
    [props.variants, selectedColors],
  );

  function toggleColor(c: string) {
    setSelectedColors((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  }

  async function publish() {
    setErr(null);
    if (!name.trim()) return setErr("Product name is required");
    if (!selectedVariants.length) return setErr("Select at least one color");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/compositions/${props.compositionId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          placement,
          variants: selectedVariants.map((v) => ({ printfulVariantId: v.id, retailPriceCents: priceCents })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; warning?: string };
      if (!res.ok || !data.ok) return setErr(data.error ?? "Publish failed");
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
        <div className="flex flex-wrap gap-4">
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
            <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">
              Retail price (all sizes)
            </label>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-bone/40">$</span>
              <input
                type="number"
                step="0.01"
                value={(priceCents / 100).toFixed(2)}
                onChange={(e) => setPriceCents(Math.round((Number(e.target.value) || 0) * 100))}
                className="w-24 rounded border border-bone/20 bg-ink px-2 py-2 text-right text-sm focus:border-hazard focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono uppercase tracking-widest text-bone/50">
            Colors ({selectedVariants.length} variants selected)
          </label>
          {colorGroups.length ? (
            <div className="mt-2 grid max-h-72 grid-cols-2 gap-1 overflow-y-auto rounded border border-bone/15 p-2 sm:grid-cols-3">
              {colorGroups.map(({ color, vs }) => {
                const on = selectedColors.has(color);
                return (
                  <button
                    key={color}
                    onClick={() => toggleColor(color)}
                    className={`flex items-center justify-between rounded border px-2 py-1 text-left text-xs ${
                      on ? "border-hazard text-bone" : "border-bone/15 text-bone/60"
                    }`}
                  >
                    <span className="truncate">{color}</span>
                    <span className="ml-1 shrink-0 text-bone/30">{vs.length}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 rounded border border-hazard/40 bg-hazard/10 px-3 py-2 text-xs text-hazard">
              {props.variantsError ?? "No variants available for this product."}
            </p>
          )}
        </div>

        {err ? <p className="text-sm text-hazard">{err}</p> : null}

        <button
          onClick={publish}
          disabled={busy || !colorGroups.length}
          className="w-full rounded bg-hazard px-4 py-3 text-sm font-bold uppercase tracking-widest text-bone disabled:opacity-50"
        >
          {busy ? "Publishing…" : `Publish to Printful (${selectedVariants.length} variants)`}
        </button>
      </div>
    </div>
  );
}
