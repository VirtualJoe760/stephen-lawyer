"use client";
import { memo } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { getTemplate } from "@/lib/printful/templates";

export type TemplateNodeData = { templateKey: string };

export const TemplateNode = memo(function TemplateNode({ id, data, selected }: NodeProps) {
  const { deleteElements } = useReactFlow();
  const key = (data as TemplateNodeData).templateKey ?? "";
  const t = getTemplate(key);
  return (
    <div
      className={`relative w-40 select-none rounded-md border bg-ink-soft p-3 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
    >
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          deleteElements({ nodes: [{ id }] });
        }}
        title="Remove from canvas"
        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-bone/20 bg-ink text-xs leading-none text-bone/70 hover:border-hazard hover:text-hazard"
      >
        ×
      </button>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-bone/5">
        {t?.mockupUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.mockupUrl} alt={t.name} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-widest text-bone/40">Template</span>
        )}
      </div>
      <p className="mt-2 truncate text-xs font-mono uppercase tracking-wide">{t?.name ?? key}</p>
    </div>
  );
});
