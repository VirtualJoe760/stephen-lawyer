"use client";
import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { getTemplate } from "@/lib/printful/templates";

export type TemplateNodeData = { templateKey: string };

export const TemplateNode = memo(function TemplateNode({ data, selected }: NodeProps) {
  const key = (data as TemplateNodeData).templateKey ?? "";
  const t = getTemplate(key);
  return (
    <div
      className={`w-40 select-none rounded-md border bg-ink-soft p-3 text-bone shadow-lg ${
        selected ? "border-hazard" : "border-bone/20"
      }`}
    >
      <div className="flex aspect-square items-center justify-center rounded bg-bone/5 text-[10px] font-mono uppercase tracking-widest text-bone/40">
        Template
      </div>
      <p className="mt-2 truncate text-xs font-mono uppercase tracking-wide">{t?.name ?? key}</p>
    </div>
  );
});
