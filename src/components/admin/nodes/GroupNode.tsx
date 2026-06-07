"use client";
import { memo, useState } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";

export type GroupNodeData = { name: string; groupId: string };

// Translucent container that wraps a group's members. Drag the header to move
// the whole group; the body is click-through so members stay interactive.
export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps) {
  const { deleteElements, updateNodeData } = useReactFlow();
  const d = data as GroupNodeData;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(d.name);

  return (
    <div
      className={`pointer-events-none h-full w-full rounded-lg border bg-bone/[0.03] ${
        selected ? "border-hazard/60" : "border-bone/15"
      }`}
    >
      {/* Header is the only interactive / draggable region. */}
      <div className="group-handle pointer-events-auto absolute -top-6 left-0 flex cursor-move items-center gap-1">
        {editing ? (
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => {
              setEditing(false);
              updateNodeData(id, { name: val.trim() || "Group" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-32 rounded border border-hazard bg-ink px-1.5 py-0.5 text-[11px] text-bone focus:outline-none"
          />
        ) : (
          <span
            onDoubleClick={() => {
              setVal(d.name);
              setEditing(true);
            }}
            title="Drag to move group · double-click to rename"
            className="select-none rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-bone/70"
          >
            {d.name}
          </span>
        )}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            deleteElements({ nodes: [{ id }] });
          }}
          title="Ungroup (keeps the items)"
          className="pointer-events-auto flex h-4 w-4 items-center justify-center rounded-full border border-bone/20 bg-ink text-[10px] leading-none text-bone/60 hover:border-hazard hover:text-hazard"
        >
          ×
        </button>
      </div>
    </div>
  );
});
