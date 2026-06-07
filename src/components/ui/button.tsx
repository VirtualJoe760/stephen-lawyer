import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "ink";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-hazard text-ink hover:bg-ink hover:text-bone border-2 border-hazard hover:border-ink",
  outline:
    "bg-transparent text-ink hover:bg-ink hover:text-bone border-2 border-ink",
  ghost: "bg-transparent text-ink hover:text-hazard border-2 border-transparent",
  ink: "bg-ink text-bone hover:bg-hazard hover:text-ink border-2 border-ink hover:border-hazard",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-12 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-mono uppercase tracking-widest transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
