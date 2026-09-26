import { describe, expect, it } from "vitest";
import { dateTime, getRiskConfig, parseRiskLevel, percent, riskLevelFromAnalysis, verdictTone } from "./utils";

describe("verdictTone", () => {
  it("maps backend verdicts to UI states", () => {
    expect(verdictTone("BENIGN")).toBe("safe");
    expect(verdictTone("SUSPICIOUS")).toBe("suspicious");
    expect(verdictTone("CONFIRMED_MALICIOUS")).toBe("malicious");
  });

  it("handles alternative verdicts and unknown values", () => {
    expect(verdictTone("SAFE")).toBe("safe");
    expect(verdictTone("MALICIOUS")).toBe("malicious");
    expect(verdictTone("CRITICAL")).toBe("malicious");
    expect(verdictTone("UNKNOWN_VERDICT")).toBe("neutral");
    expect(verdictTone("")).toBe("neutral");
  });
});

describe("parseRiskLevel", () => {
  it("parses all six risk levels correctly", () => {
    expect(parseRiskLevel("SAFE")).toBe("SAFE");
    expect(parseRiskLevel("BENIGN")).toBe("SAFE");
    expect(parseRiskLevel("LOW")).toBe("LOW");
    expect(parseRiskLevel("LOW_RISK")).toBe("LOW");
    expect(parseRiskLevel("SUSPICIOUS")).toBe("SUSPICIOUS");
    expect(parseRiskLevel("HIGH RISK")).toBe("HIGH RISK");
    expect(parseRiskLevel("HIGH_RISK")).toBe("HIGH RISK");
    expect(parseRiskLevel("HIGH")).toBe("HIGH RISK");
    expect(parseRiskLevel("MALICIOUS")).toBe("MALICIOUS");
    expect(parseRiskLevel("CONFIRMED_MALICIOUS")).toBe("MALICIOUS");
    expect(parseRiskLevel("PHISHING")).toBe("MALICIOUS");
    expect(parseRiskLevel("PHISHING_EMAIL")).toBe("MALICIOUS");
    expect(parseRiskLevel("LEGITIMATE")).toBe("SAFE");
    expect(parseRiskLevel("LEGITIMATE_EMAIL")).toBe("SAFE");
    expect(parseRiskLevel("CRITICAL")).toBe("CRITICAL");
  });

  it("handles unknown, undefined, and empty values gracefully", () => {
    expect(parseRiskLevel("")).toBe("UNKNOWN");
    expect(parseRiskLevel(undefined)).toBe("UNKNOWN");
    expect(parseRiskLevel(null)).toBe("UNKNOWN");
    expect(parseRiskLevel(123)).toBe("UNKNOWN");
    expect(parseRiskLevel("OTHER_STRING")).toBe("UNKNOWN");
  });
});

describe("riskLevelFromAnalysis", () => {
  it("determines risk level from probability", () => {
    expect(riskLevelFromAnalysis("phishing", 0.95)).toBe("CRITICAL");
    expect(riskLevelFromAnalysis("phishing", 0.75)).toBe("MALICIOUS");
    expect(riskLevelFromAnalysis(null, 0.60)).toBe("HIGH RISK");
    expect(riskLevelFromAnalysis(null, 0.40)).toBe("SUSPICIOUS");
    expect(riskLevelFromAnalysis(null, 0.18)).toBe("LOW");
    expect(riskLevelFromAnalysis("benign", 0.05)).toBe("SAFE");
  });
});

describe("getRiskConfig", () => {
  it("returns appropriate visual config and color tokens for each risk level", () => {
    expect(getRiskConfig("SAFE").hex).toBe("#10B981");
    expect(getRiskConfig("LOW").hex).toBe("#14B8A6");
    expect(getRiskConfig("SUSPICIOUS").hex).toBe("#F59E0B");
    expect(getRiskConfig("HIGH RISK").hex).toBe("#F97316");
    expect(getRiskConfig("MALICIOUS").hex).toBe("#EF4444");
    expect(getRiskConfig("CRITICAL").hex).toBe("#DC2626");
    expect(getRiskConfig("UNKNOWN").hex).toBe("#64748B");
  });
});

describe("format helpers", () => {
  it("formats percent correctly", () => {
    expect(percent(0.854)).toBe("85%");
    expect(percent(null)).toBe("Unavailable");
  });

  it("formats dateTime correctly", () => {
    const d = dateTime("2026-09-13T00:00:00Z");
    expect(typeof d).toBe("string");
    expect(d.length).toBeGreaterThan(0);
  });
});

describe("investigation storage helpers", () => {
  it("saves and retrieves investigation IDs from localStorage", async () => {
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => { storage[key] = val; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    };
    (globalThis as unknown as { localStorage: typeof mockLocalStorage }).localStorage = mockLocalStorage;

    const { getStoredInvestigationIds, saveInvestigationId } = await import("./utils");
    expect(getStoredInvestigationIds()).toEqual([]);

    saveInvestigationId("inv-1234");
    expect(getStoredInvestigationIds()).toEqual(["inv-1234"]);

    // Does not duplicate IDs
    saveInvestigationId("inv-1234");
    expect(getStoredInvestigationIds()).toEqual(["inv-1234"]);

    // Prepends new IDs
    saveInvestigationId("inv-5678");
    expect(getStoredInvestigationIds()).toEqual(["inv-5678", "inv-1234"]);
  });
});


