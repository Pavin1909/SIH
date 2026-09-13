import { getRiskConfig, parseRiskLevel, RiskLevel } from "../../utils";

export interface RiskIndicatorProps {
  level: RiskLevel | string | unknown;
  score?: number | null;
  showDot?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RiskIndicator({
  level,
  score,
  showDot = true,
  className = "",
  size = "md",
}: RiskIndicatorProps) {
  const config = getRiskConfig(level);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const dotSizes = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-semibold uppercase tracking-wider ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} ${className}`}
    >
      {showDot && (
        <span
          className={`shrink-0 rounded-full ${dotSizes[size]} ${config.dotColor}`}
        />
      )}
      <span>{config.label}</span>
      {score !== undefined && score !== null && (
        <span className="ml-1 opacity-75 font-mono">
          ({score}/100)
        </span>
      )}
    </span>
  );
}
