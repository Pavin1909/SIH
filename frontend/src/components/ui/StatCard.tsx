import { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  status?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  status,
  icon,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-[#0c1527]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-200 hover:border-cyan-500/30 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-cyan-400">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-3">
        <div className="text-2xl font-bold tracking-tight text-slate-100">
          {value}
        </div>
        {status && <div className="shrink-0">{status}</div>}
      </div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
