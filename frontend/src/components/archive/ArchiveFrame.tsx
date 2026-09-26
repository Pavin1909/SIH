import { ReactNode } from "react";

export interface ArchiveFrameProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  referenceId?: string;
  className?: string;
  elevated?: boolean;
}

export function ArchiveFrame({
  children,
  title,
  subtitle,
  badge,
  action,
  referenceId,
  className = "",
  elevated = false,
}: ArchiveFrameProps) {
  return (
    <section
      className={`relative rounded-xl border transition-all ${
        elevated
          ? "border-[#dfc28d]/35 bg-[#1d162d]/90 shadow-[0_16px_45px_rgba(0,0,0,0.65)]"
          : "border-[#c8a96e]/25 bg-[#161122]/85 shadow-[0_10px_35px_rgba(0,0,0,0.55)]"
      } backdrop-blur-xl ${className}`}
    >
      {/* Ornamental Corner Flourishes */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 left-2 font-serif text-[10px] text-[#c8a96e]/60 select-none"
      >
        ❖
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1.5 right-2 font-serif text-[10px] text-[#c8a96e]/60 select-none"
      >
        ❖
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 left-2 font-serif text-[10px] text-[#c8a96e]/40 select-none"
      >
        ❖
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 right-2 font-serif text-[10px] text-[#c8a96e]/40 select-none"
      >
        ❖
      </span>

      {/* Archival Folio Header */}
      {(title || referenceId || action || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c8a96e]/15 px-5 py-3.5">
          <div className="space-y-0.5">
            {referenceId && (
              <div className="font-mono text-[10px] font-semibold tracking-wider text-[#c8a96e]/80 uppercase">
                {referenceId}
              </div>
            )}
            {title && (
              <h2 className="font-serif text-sm font-bold tracking-wide text-[#f5ebd9]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-[#a498b2] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {badge}
            {action}
          </div>
        </div>
      )}

      {/* Main Folio Content */}
      <div className="p-5">{children}</div>
    </section>
  );
}
