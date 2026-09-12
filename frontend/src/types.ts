export type UrlInfo = { id: string; url: string; domain: string };
export type EmailInfo = { id: string; sender: string | null; recipients: string[]; subject: string | null; text_body: string; html_body: string | null; urls: UrlInfo[]; created_at: string };
export type Analysis = { id: string; email_id: string; model_name: string; label: string; phishing_probability: number | null; email_phishing_probability: number | null; url_phishing_probability: number; class_probabilities: Record<string, number>; confidence: number; created_at: string };
export type AnalysisWithEmail = Analysis & { email: EmailInfo };
export type ProviderObservation = { provider: string; status: string; response: Record<string, unknown> };
export type BrowserObservation = { initial_url: string; final_url: string | null; redirect_chain: string[]; requests: Array<Record<string, unknown>>; domains: string[]; html: string; screenshot_available: boolean; dom_signals: Record<string, unknown>; javascript_signals: Record<string, unknown> };
export type ForensicRun = { id: string; analysis_id: string; email_url_id: string; url: string; status: string; verdict: string; risk_score: number; fused_evidence: Record<string, unknown>; browser_observation: BrowserObservation | null; provider_observations: ProviderObservation[]; created_at: string };
export type ForensicReport = { run_id: string; report_json: Record<string, unknown>; report_markdown: string };
