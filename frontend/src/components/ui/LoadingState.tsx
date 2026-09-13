import { Refresh } from "../icons";

export interface LoadingStateProps {
  message?: string;
  type?: "spinner" | "skeleton";
  className?: string;
}

export function LoadingState({
  message = "Loading investigation telemetry…",
  type = "spinner",
  className = "",
}: LoadingStateProps) {
  if (type === "skeleton") {
    return (
      <div className={`space-y-4 rounded-xl border border-soc-700/60 bg-soc-850/60 p-6 ${className}`}>
        <div className="h-4 w-1/4 animate-pulse rounded bg-soc-700/60" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-soc-700/40" />
        <div className="h-20 w-full animate-pulse rounded bg-soc-800/50" />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-soc-700/60 bg-soc-850/60 p-10 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
        <Refresh size={22} className="animate-spin" />
      </div>
      <p className="mt-3.5 text-sm font-medium text-slate-300">{message}</p>
    </div>
  );
}
