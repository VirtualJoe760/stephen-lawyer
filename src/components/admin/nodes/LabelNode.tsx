"use client";
import { memo, useState } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";

// Canvas text node: the "+" / "=" separators and the editable group name.
export type LabelNodeData = { text: string };

export const LabelNode = memo(function LabelNode({ id, data }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const d = data as LabelNodeData;
  const isSymbol = d.text === "+" || d.text === "=";
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(d.text);

  if (isSymbol) {
    return <div className="select-none text-3xl font-bold text-bone/40">{d.text}</div>;
  }

  if (editing) {
    const commit = () => {
      setEditing(false);
      updateNodeData(id, { text: val.trim() || "Group" });
    };
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-40 rounded border border-hazard bg-ink px-2 py-1 text-sm text-bone focus:outline-none"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => {
        setVal(d.text);
        setEditing(true);
      }}
      title="Double-click to rename"
      className="cursor-text select-none whitespace-nowrap font-mono text-sm font-bold uppercase tracking-wide text-bone/80 hover:text-hazard"
    >
      {d.text}
    </div>
  );
});
