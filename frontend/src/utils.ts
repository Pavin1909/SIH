export function verdictTone(verdict: string): "safe" | "suspicious" | "malicious" | "neutral" {
  if (verdict === "BENIGN" || verdict === "SAFE") return "safe";
  if (verdict === "CONFIRMED_MALICIOUS" || verdict === "MALICIOUS") return "malicious";
  if (verdict === "SUSPICIOUS") return "suspicious";
  return "neutral";
}

export function percent(value: number | null): string { return value === null ? "Unavailable" : `${Math.round(value * 100)}%`; }
export function dateTime(value: string): string { return new Date(value).toLocaleString(); }
