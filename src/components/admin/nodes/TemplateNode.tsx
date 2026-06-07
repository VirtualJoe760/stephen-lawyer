"use client";
import { memo, useState } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";

export type TemplateNodeData = {
  productId: string;
  name?: string;
  image?: string;
  selectedColor?: string;
};
interface ColorOpt {
  color: string;
  colorCode: string;
  image: string;
}

export const TemplateNode = memo(function TemplateNode({ id, data, selected }: NodeProps) {
  const { deleteElements, updateNodeData } = useReactFlow();
  const d = data as TemplateNodeData;
  const [open, setOpen] = useState(false);
  const [colors, setColors] = useState<ColorOpt[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggleColors() {
    const next = !open;
    setOpen(next);
    if (next && colors === null && !loading) {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/blank/${d.productId}/colors`);
        const j = (await r.json().catch(() => ({}))) as { colors?: ColorOpt[] };
        setColors(Array.isArray(j.colors) ? j.colors : []);
      } finally {
        setLoading(false);
      }
    }
  }
  function pick(c: ColorOpt) {
    updateNodeData(id, { image: c.image || d.image, selectedColor: c.color });
    setOpen(false);
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-md border bg-ink-soft p-2 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
    >
      <NodeResizer
        minWidth={92}
        minHeight={112}
        isVisible={!!selected}
        lineClassName="!border-hazard/60"
        handleClassName="!h-2 !w-2 !rounded-sm !border-hazard !bg-hazard"
      />
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          deleteElements({ nodes: [{ id }] });
        }}
        title="Remove from canvas"
        className="absolute -right-2 -top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full border border-bone/20 bg-ink text-xs leading-none text-bone/70 hover:border-hazard hover:text-hazard"
      >
        ×
      </button>
      <div className="min-h-0 flex-1 overflow-hidden rounded bg-bone/5">
        {d.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt={d.name ?? "blank"} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">
            Blank
          </div>
        )}
      </div>
      <p className="mt-1 truncate text-[10px] font-mono uppercase tracking-wide">{d.name ?? d.productId}</p>
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          toggleColors();
        }}
        className="flex w-full items-center justify-between text-[9px] font-mono uppercase tracking-wide text-bone/50 hover:text-hazard"
      >
        <span className="truncate">{d.selectedColor || "Color"}</span>
        <span>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 flex max-h-28 flex-wrap gap-1 overflow-y-auto rounded border border-bone/15 bg-ink-soft p-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {loading ? <span className="text-[10px] text-bone/40">Loading…</span> : null}
          {colors && !colors.length && !loading ? <span className="text-[10px] text-bone/40">No colors</span> : null}
          {colors?.map((c) => (
            <button
              key={c.color}
              title={c.color}
              onClick={(e) => {
                e.stopPropagation();
                pick(c);
              }}
              className={`h-5 w-5 rounded-full border ${d.selectedColor === c.color ? "border-hazard" : "border-bone/30"}`}
              style={{ background: c.colorCode || "#888888" }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});
