"use client";
import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

export type CompositionNodeData = {
  compositionId: string;
  status: "generating" | "draft" | "approved" | "published" | "failed";
  previewUrl?: string | null;
  onOpen?: (id: string) => void;
};

export const CompositionNode = memo(function CompositionNode({ data, selected }: NodeProps) {
  const c = data as CompositionNodeData;
  const generating = c.status === "generating";
  const failed = c.status === "failed";
  return (
    <div
      className={`w-48 select-none rounded-md border bg-ink-soft p-2 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
      onDoubleClick={() => c.onOpen?.(c.compositionId)}
    >
      <div className="relative aspect-square overflow-hidden rounded bg-bone/5">
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
      <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-bone/50">{c.status}</p>
    </div>
  );
});
