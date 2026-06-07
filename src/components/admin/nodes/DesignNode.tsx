"use client";
import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

export type DesignNodeData = { designId: string; thumbUrl?: string; prompt?: string };

export const DesignNode = memo(function DesignNode({ data, selected }: NodeProps) {
  const d = data as DesignNodeData;
  return (
    <div
      className={`w-40 select-none rounded-md border bg-ink-soft p-2 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
    >
      <div className="aspect-square overflow-hidden rounded bg-bone/5">
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
