import { cn } from "@/lib/utils";

type Tone = "hazard" | "acid" | "cobalt" | "pink" | "ink";

const tones: Record<Tone, string> = {
  hazard: "bg-hazard text-ink",
  acid: "bg-acid text-ink",
  cobalt: "bg-cobalt text-bone",
  pink: "bg-pink text-ink",
  ink: "bg-ink text-bone",
};

export function Badge({
  children,
  tone = "hazard",
  className,
  rotate = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  rotate?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5",
        tones[tone],
        rotate && "-rotate-3",
        className,
      )}
    >
      {children}
    </span>
  );
}
