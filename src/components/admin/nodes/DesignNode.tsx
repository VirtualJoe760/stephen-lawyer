"use client";
import { memo } from "react";
import { NodeResizer, useReactFlow, type NodeProps } from "@xyflow/react";

export type DesignNodeData = { designId: string; thumbUrl?: string; prompt?: string };

export const DesignNode = memo(function DesignNode({ id, data, selected }: NodeProps) {
  const { deleteElements } = useReactFlow();
  const d = data as DesignNodeData;
  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-md border bg-ink-soft p-2 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
    >
      <NodeResizer
        minWidth={80}
        minHeight={90}
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
        {d.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.thumbUrl} alt={d.prompt ?? "design"} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-mono uppercase tracking-widest text-bone/40">
            Design
          </div>
        )}
      </div>
      {d.prompt ? <p className="mt-1 truncate text-[10px] text-bone/50">{d.prompt}</p> : null}
    </div>
  );
});
