"use client";

export type ToolMode = "select" | "box";

type IconProps = { className?: string };
const Cursor = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l6 18 2.5-7L21 11.5 5 3z" /></svg>
);
const BoxIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" strokeLinecap="round"><rect x="4" y="5" width="16" height="14" rx="1" /></svg>
);
const Merge = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="9" height="9" rx="1" /><rect x="12" y="11" width="9" height="9" rx="1" /></svg>
);

function Btn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded ${
        active ? "bg-hazard text-bone" : "text-bone/60 hover:bg-bone/10 hover:text-bone"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export function DesignerToolbar({
  mode,
  onMode,
  onCombine,
  canCombine,
}: {
  mode: ToolMode;
  onMode: (m: ToolMode) => void;
  onCombine: () => void;
  canCombine: boolean;
}) {
  return (
    <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md border border-bone/15 bg-ink-soft/90 p-1 backdrop-blur">
      <Btn active={mode === "select"} onClick={() => onMode("select")} title="Select / move">
        <Cursor className="h-4 w-4" />
      </Btn>
      <Btn active={mode === "box"} onClick={() => onMode("box")} title="Box select (group multiple)">
        <BoxIcon className="h-4 w-4" />
      </Btn>
      <div className="mx-0.5 h-5 w-px bg-bone/15" />
      <Btn
        disabled={!canCombine}
        onClick={onCombine}
        title="Combine selection — design + product, or merge two designs"
      >
        <Merge className="h-4 w-4" />
      </Btn>
    </div>
  );
}
