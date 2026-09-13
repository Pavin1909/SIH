export type RiskLevel =
  | "SAFE"
  | "LOW"
  | "SUSPICIOUS"
  | "HIGH RISK"
  | "MALICIOUS"
  | "CRITICAL";

export function verdictTone(verdict: string): "safe" | "suspicious" | "malicious" | "neutral" {
  if (!verdict) return "neutral";
  const normalized = verdict.trim().toUpperCase().replace(/[-_]/g, " ");
  if (
    normalized === "BENIGN" ||
    normalized === "SAFE" ||
    normalized === "LOW" ||
    normalized === "LOW RISK" ||
    normalized === "LEGITIMATE" ||
    normalized.startsWith("LEGITIMATE")
  )
    return "safe";
  if (
    normalized === "CONFIRMED MALICIOUS" ||
    normalized === "MALICIOUS" ||
    normalized === "CRITICAL" ||
    normalized === "HIGH" ||
    normalized === "HIGH RISK" ||
    normalized === "PHISHING" ||
    normalized.startsWith("PHISHING")
  )
    return "malicious";
  if (normalized === "SUSPICIOUS") return "suspicious";
  return "neutral";
}

export function parseRiskLevel(value: unknown): RiskLevel | "UNKNOWN" {
  if (typeof value !== "string" || !value.trim()) return "UNKNOWN";
  const normalized = value.trim().toUpperCase().replace(/[-_]/g, " ");
  if (
    normalized === "SAFE" ||
    normalized === "BENIGN" ||
    normalized === "LEGITIMATE" ||
    normalized.startsWith("LEGITIMATE")
  )
    return "SAFE";
  if (normalized === "LOW" || normalized === "LOW RISK") return "LOW";
  if (normalized === "SUSPICIOUS") return "SUSPICIOUS";
  if (normalized === "HIGH" || normalized === "HIGH RISK") return "HIGH RISK";
  if (
    normalized === "MALICIOUS" ||
    normalized === "CONFIRMED MALICIOUS" ||
    normalized === "PHISHING" ||
    normalized.startsWith("PHISHING")
  )
    return "MALICIOUS";
  if (normalized === "CRITICAL") return "CRITICAL";
  return "UNKNOWN";
}

export function riskLevelFromAnalysis(label?: string | null, probability?: number | null): RiskLevel {
  if (probability !== null && probability !== undefined) {
    if (probability >= 0.85) return "CRITICAL";
    if (probability >= 0.70) return "MALICIOUS";
    if (probability >= 0.50) return "HIGH RISK";
    if (probability >= 0.35) return "SUSPICIOUS";
    if (probability >= 0.15) return "LOW";
    return "SAFE";
  }
  const parsed = parseRiskLevel(label);
  return parsed === "UNKNOWN" ? "SUSPICIOUS" : parsed;
}

export interface RiskConfig {
  level: RiskLevel | "UNKNOWN";
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  hex: string;
}

export function getRiskConfig(value: unknown): RiskConfig {
  const level = parseRiskLevel(value);
  switch (level) {
    case "SAFE":
      return {
        level,
        label: "SAFE",
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        dotColor: "bg-emerald-400",
        hex: "#10B981",
      };
    case "LOW":
      return {
        level,
        label: "LOW",
        textColor: "text-teal-300",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/30",
        dotColor: "bg-teal-400",
        hex: "#14B8A6",
      };
    case "SUSPICIOUS":
      return {
        level,
        label: "SUSPICIOUS",
        textColor: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        dotColor: "bg-amber-400",
        hex: "#F59E0B",
      };
    case "HIGH RISK":
      return {
        level,
        label: "HIGH RISK",
        textColor: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
        dotColor: "bg-orange-400",
        hex: "#F97316",
      };
    case "MALICIOUS":
      return {
        level,
        label: "MALICIOUS",
        textColor: "text-rose-400",
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/30",
        dotColor: "bg-rose-400",
        hex: "#EF4444",
      };
    case "CRITICAL":
      return {
        level,
        label: "CRITICAL",
        textColor: "text-red-300",
        bgColor: "bg-red-600/15",
        borderColor: "border-red-500/40",
        dotColor: "bg-red-500",
        hex: "#DC2626",
      };
    default:
      return {
        level: "UNKNOWN",
        label: typeof value === "string" && value ? value : "UNKNOWN",
        textColor: "text-slate-400",
        bgColor: "bg-slate-800/50",
        borderColor: "border-slate-700",
        dotColor: "bg-slate-500",
        hex: "#64748B",
      };
  }
}

export function percent(value: number | null): string { return value === null ? "Unavailable" : `${Math.round(value * 100)}%`; }
export function dateTime(value: string): string { return new Date(value).toLocaleString(); }

