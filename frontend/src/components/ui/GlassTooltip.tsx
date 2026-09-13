import { ReactNode } from "react";

export interface GlassTooltipProps {
  category?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  visible: boolean;
  className?: string;
}

export function GlassTooltip({
  category,
  title,
  description,
  icon,
  visible,
  className = "",
}: GlassTooltipProps) {
  if (!visible) return null;

  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 flex items-center gap-3.5 rounded-xl border border-cyan-500/30 bg-[#0b1324]/95 px-4 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-2xl transition-all duration-150 whitespace-nowrap ${className}`}
    >
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          {icon}
        </div>
      )}
      <div className="text-left">
        {category && (
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {category}
          </div>
        )}
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {description && (
          <div className="text-[11px] text-slate-400">{description}</div>
        )}
      </div>

      {/* Subtle arrow pointer pointing left towards the icon */}
      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border-l border-b border-cyan-500/30 bg-[#0b1324]" />
    </div>
  );
}
