"use client";
import { memo } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";

export type CompositionNodeData = {
  compositionId: string;
  status: "generating" | "draft" | "approved" | "published" | "failed";
  previewUrl?: string | null;
};

export const CompositionNode = memo(function CompositionNode({ id, data, selected }: NodeProps) {
  const { deleteElements } = useReactFlow();
  const c = data as CompositionNodeData;
  const generating = c.status === "generating";
  const failed = c.status === "failed";
  return (
    <div
      className={`relative flex h-full w-full cursor-pointer flex-col rounded-md border bg-ink-soft p-2 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
    >
      <NodeResizer
        minWidth={100}
        minHeight={120}
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
      <div className="relative min-h-0 flex-1 overflow-hidden rounded bg-bone/5">
        {c.previewUrl && !generating ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.previewUrl} alt="composite" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">
            {failed ? "Failed" : generating ? "Rendering…" : "Composite"}
          </div>
        )}
        {generating ? <div className="absolute inset-0 animate-pulse bg-bone/5" /> : null}
      </div>
      <p className="mt-1 text-[9px] font-mono uppercase tracking-widest text-bone/50">{c.status} · tap to open</p>
    </div>
  );
});
