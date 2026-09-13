import { ReactNode } from "react";
import { verdictTone } from "../../utils";

export type BadgeVariant = "neutral" | "cyan" | "safe" | "warning" | "danger";

export interface BadgeProps {
  value?: string;
  variant?: BadgeVariant;
  children?: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({
  value,
  variant,
  children,
  className = "",
  dot = false,
}: BadgeProps) {
  let resolvedVariant: BadgeVariant = variant || "neutral";

  if (!variant && value) {
    const tone = verdictTone(value);
    if (tone === "safe") resolvedVariant = "safe";
    else if (tone === "suspicious") resolvedVariant = "warning";
    else if (tone === "malicious") resolvedVariant = "danger";
    else resolvedVariant = "neutral";
  }

  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    neutral: {
      bg: "bg-slate-800/60",
      text: "text-slate-300",
      border: "border-slate-700/60",
      dotColor: "bg-slate-400",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-300",
      border: "border-cyan-500/30",
      dotColor: "bg-cyan-400",
    },
    safe: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
      dotColor: "bg-emerald-400",
    },
    warning: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
      dotColor: "bg-amber-400",
    },
    danger: {
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      border: "border-rose-500/30",
      dotColor: "bg-rose-400",
    },
  };

  const style = variantStyles[resolvedVariant];
  const content = children || (value ? value.replace(/_/g, " ") : null);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${style.dotColor}`} />}
      {content}
    </span>
  );
}
