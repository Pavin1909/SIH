import type { Analysis, AnalysisWithEmail, EmailInfo, ForensicReport, ForensicRun, LatestInvestigation } from "./types";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.text();
    let message = body || `Request failed (${response.status})`;
    try { message = JSON.parse(body).detail || message; } catch { /* use plain text */ }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  analyzeEmail: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<AnalysisWithEmail>("/api/v1/emails/analyze", { method: "POST", body: form });
  },
  analysis: (id: string) => request<Analysis>(`/api/v1/analyses/${id}`),
  latestInvestigation: () => request<LatestInvestigation>("/api/v1/investigations/latest"),
  latestForensicsForAnalysis: (analysisId: string) => request<ForensicRun>(`/api/v1/analyses/${analysisId}/forensics/latest`),
  email: (id: string) => request<EmailInfo>(`/api/v1/emails/${id}`),
  startForensics: (analysisId: string, urlId: string) => request<ForensicRun>(`/api/v1/analyses/${analysisId}/forensics/${urlId}`, { method: "POST" }),
  forensics: (runId: string) => request<ForensicRun>(`/api/v1/forensics/${runId}`),
  enrich: (runId: string) => request<ForensicRun>(`/api/v1/forensics/${runId}/enrich`, { method: "POST" }),
  report: (runId: string) => request<ForensicReport>(`/api/v1/forensics/${runId}/report`),
};
