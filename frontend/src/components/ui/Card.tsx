import { ReactNode } from "react";

export interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

export function Card({
  title,
  subtitle,
  headerAction,
  footer,
  children,
  className = "",
  elevated = false,
}: CardProps) {
  const hasHeader = Boolean(title || subtitle || headerAction);

  return (
    <div
      className={`rounded-2xl border ${
        elevated
          ? "border-cyan-500/25 bg-[#0f1a30]/75 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          : "border-white/[0.08] bg-[#0c1527]/60 shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-cyan-500/20"
      } backdrop-blur-xl transition-all ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="border-t border-white/[0.06] bg-[#080d19]/40 px-5 py-3 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
}
