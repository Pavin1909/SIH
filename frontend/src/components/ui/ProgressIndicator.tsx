export interface ProgressIndicatorProps {
  value?: number; // 0 to 100
  indeterminate?: boolean;
  label?: string;
  className?: string;
}

export function ProgressIndicator({
  value = 0,
  indeterminate = false,
  label,
  className = "",
}: ProgressIndicatorProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || !indeterminate) && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          {label && <span>{label}</span>}
          {!indeterminate && <span className="font-mono">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-soc-950 border border-soc-700/60">
        {indeterminate ? (
          <div className="absolute inset-y-0 w-1/3 rounded-full bg-cyan-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300"
            style={{ width: `${clampedValue}%` }}
          />
        )}
      </div>
    </div>
  );
}
