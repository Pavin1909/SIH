import { ReactNode } from "react";
import { AlertTriangle, Refresh } from "../icons";

export interface ErrorStateProps {
  title?: string;
  message: ReactNode;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Telemetry Error",
  message,
  retry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/20 p-8 text-center backdrop-blur-sm ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400">
        <AlertTriangle size={24} />
      </div>
      <h3 className="mt-3.5 text-base font-semibold text-rose-300">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-300">{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
        >
          <Refresh size={14} />
          Retry Request
        </button>
      )}
    </div>
  );
}
