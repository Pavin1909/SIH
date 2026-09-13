import { ReactNode } from "react";
import { Radar } from "../icons";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-soc-700/60 bg-soc-850/60 p-10 text-center backdrop-blur-sm ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-soc-700 bg-soc-900/90 text-slate-400">
        {icon || <Radar size={28} className="text-slate-500" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-200">{title}</h3>
      {message && (
        <p className="mt-1.5 max-w-md text-sm text-slate-400">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
