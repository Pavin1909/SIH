export type SystemStatus = "online" | "offline" | "checking" | "degraded";

export interface StatusIndicatorProps {
  status: SystemStatus;
  label?: string;
  pulse?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function StatusIndicator({
  status,
  label,
  pulse = true,
  className = "",
  size = "md",
}: StatusIndicatorProps) {
  const configs: Record<
    SystemStatus,
    { color: string; ringColor: string; defaultLabel: string; pulseClass: string }
  > = {
    online: {
      color: "bg-emerald-500",
      ringColor: "ring-emerald-500/20",
      defaultLabel: "Online",
      pulseClass: "animate-pulse",
    },
    degraded: {
      color: "bg-amber-500",
      ringColor: "ring-amber-500/20",
      defaultLabel: "Degraded",
      pulseClass: "animate-pulse",
    },
    checking: {
      color: "bg-cyan-500",
      ringColor: "ring-cyan-500/20",
      defaultLabel: "Checking…",
      pulseClass: "animate-ping",
    },
    offline: {
      color: "bg-rose-500",
      ringColor: "ring-rose-500/20",
      defaultLabel: "Offline",
      pulseClass: "",
    },
  };

  const config = configs[status] || configs.offline;
  const displayLabel = label ?? config.defaultLabel;

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex items-center justify-center">
        {pulse && status !== "offline" && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color} ${
              status === "checking" ? "animate-ping" : "animate-pulse"
            }`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ring-4 ${dotSizes[size]} ${config.color} ${config.ringColor}`}
        />
      </span>
      {displayLabel && (
        <span className="text-xs font-medium text-slate-300">
          {displayLabel}
        </span>
      )}
    </div>
  );
}
