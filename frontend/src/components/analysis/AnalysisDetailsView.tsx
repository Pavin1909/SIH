import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../../api";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Code,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  Radar,
  Refresh,
  Shield,
  Terminal,
} from "../icons";
import { RiskIndicator } from "../ui/RiskIndicator";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import type { Analysis, AnalysisWithEmail, EmailInfo, ForensicRun } from "../../types";
import { dateTime, percent, riskLevelFromAnalysis, verdictTone } from "../../utils";

const cache = {
  get<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") as T | null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatPercent(val?: number | null, fallback = "—"): string {
  if (val === undefined || val === null) return fallback;
  return `${(val * 100).toFixed(2)}%`;
}

export function AnalysisDetailsView() {
  const { analysisId = "" } = useParams<{ analysisId: string }>();
  const navigate = useNavigate();

  // Core Data States
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [email, setEmail] = useState<EmailInfo | null>(null);
  const [linkedRun, setLinkedRun] = useState<ForensicRun | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Interaction States
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeEvidenceTab, setActiveTab] = useState<"body" | "headers">("body");
  const [activeIndicatorTab, setActiveIndicatorTab] = useState<string>("urls");
  const [runningUrlId, setRunningUrlId] = useState<string | null>(null);
  const [forensicStage, setForensicStage] = useState<string>("");
  const [forensicError, setForensicError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Fetch Analysis and Associated Email
  const loadInvestigation = async () => {
    if (!analysisId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      // 1. Fetch Analysis details
      const detail = await api.analysis(analysisId);

      // 2. Fetch or retrieve Email metadata
      const cached = cache.get<AnalysisWithEmail>("lastAnalysis");
      let emailDetail: EmailInfo;
      if (cached && cached.id === detail.id && cached.email) {
        emailDetail = cached.email;
      } else {
        emailDetail = await api.email(detail.email_id);
      }

      setAnalysis(detail);
      setEmail(emailDetail);

      // 3. Check for any cached or completed forensic run linked to this analysis
      const cachedRun = cache.get<ForensicRun>("lastRun");
      if (cachedRun && cachedRun.analysis_id === detail.id) {
        setLinkedRun(cachedRun);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load analysis record.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestigation();
  }, [analysisId]);

  // Copy helper with transient state
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // URL Forensics Trigger
  const handleStartForensics = async (urlId: string) => {
    if (!analysis) return;
    setRunningUrlId(urlId);
    setForensicStage("Initiating headless sandbox & DOM inspection…");
    setForensicError(null);

    try {
      setForensicStage("Executing Playwright, VLM, and live GeoIP fusion…");
      const run = await api.startForensics(analysis.id, urlId);
      setForensicStage("Forensics complete. Redirecting…");
      cache.set("lastRun", run);
      setLinkedRun(run);
      navigate(`/forensics/${run.id}`);
    } catch (err) {
      setForensicStage("");
      setForensicError(
        err instanceof Error ? err.message : "Forensics execution failed. Check backend logs."
      );
    } finally {
      setRunningUrlId(null);
    }
  };

  // Extract unique domains for indicator tabs
  const uniqueDomains = useMemo(() => {
    if (!email?.urls) return [];
    const domains = new Set<string>();
    email.urls.forEach((u) => {
      if (u.domain) domains.add(u.domain);
    });
    return Array.from(domains);
  }, [email?.urls]);

  // Determine which indicator tabs actually have data
  const availableIndicatorTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; count: number }> = [];
    if (email?.urls && email.urls.length > 0) {
      tabs.push({ id: "urls", label: "URLs", count: email.urls.length });
    }
    if (uniqueDomains.length > 0) {
      tabs.push({ id: "domains", label: "Domains", count: uniqueDomains.length });
    }
    if (email?.sha256) {
      tabs.push({ id: "hashes", label: "Hashes", count: 1 });
    }
    return tabs;
  }, [email?.urls, uniqueDomains, email?.sha256]);

  // Adjust active tab if current tab is not available
  useEffect(() => {
    if (availableIndicatorTabs.length > 0) {
      if (!availableIndicatorTabs.some((t) => t.id === activeIndicatorTab)) {
        setActiveIndicatorTab(availableIndicatorTabs[0].id);
      }
    }
  }, [availableIndicatorTabs, activeIndicatorTab]);

  // Computed Risk & Verdict Tone
  const effectiveProb = analysis
    ? analysis.phishing_probability ??
      analysis.email_phishing_probability ??
      analysis.url_phishing_probability
    : null;

  const riskLevel = analysis ? riskLevelFromAnalysis(analysis.label, effectiveProb) : "UNKNOWN";
  const tone = analysis ? verdictTone(analysis.label) : "neutral";

  // Semantic styles for the primary verdict panel based strictly on real backend tone
  const verdictGlowClass = {
    safe: "border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.12)] bg-gradient-to-b from-emerald-950/20 via-[#0c1527]/70 to-[#080d19]/90",
    suspicious: "border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.12)] bg-gradient-to-b from-amber-950/20 via-[#0c1527]/70 to-[#080d19]/90",
    malicious: "border-rose-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] bg-gradient-to-b from-rose-950/25 via-[#0c1527]/70 to-[#080d19]/90",
    neutral: "border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-gradient-to-b from-slate-900/30 via-[#0c1527]/70 to-[#080d19]/90",
  }[tone];

  // 15. Loading State
  if (loading) {
    return (
      <div className="py-16">
        <LoadingState message="Loading investigation details from backend…" />
      </div>
    );
  }

  // 16. Not Found State
  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.2)]">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Analysis Not Found</h1>
        <p className="mt-2 text-sm text-slate-400">
          The requested investigation ID (<span className="font-mono text-cyan-400">{analysisId}</span>) could not be loaded or does not exist in the database.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/email-analysis"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50"
          >
            <ArrowLeft size={14} />
            Back to Email Analysis
          </Link>
        </div>
      </div>
    );
  }

  // 16. General Error State
  if (error || !analysis || !email) {
    return (
      <div className="py-16">
        <ErrorState
          title="Investigation Load Failure"
          message={error || "An unexpected error occurred while fetching analysis evidence."}
          retry={loadInvestigation}
        />
        <div className="mt-6 text-center">
          <Link
            to="/email-analysis"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={14} />
            Return to Email Analysis console
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. INVESTIGATION HEADER */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-[#0c1527]/50 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link
                to="/email-analysis"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft size={13} />
                Back to Email Analysis
              </Link>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                <Radar size={11} />
                Threat Investigation
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Analysis Details
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-400">
              <span>Analysis ID:</span>
              <span className="font-mono text-cyan-300/90">{analysis.id}</span>
              <button
                type="button"
                onClick={() => handleCopy(analysis.id, "analysisId")}
                className="inline-flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:text-white transition-colors"
                title="Copy Analysis UUID"
              >
                {copiedKey === "analysisId" ? (
                  <>
                    <Check size={11} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Bar (Top Right) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadInvestigation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080d19]/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 transition-all"
            >
              <Refresh size={13} />
              Refresh
            </button>
            <Link
              to="/email-analysis"
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:bg-cyan-500/25 hover:border-cyan-500/60 transition-all"
            >
              <Mail size={13} />
              Start New Analysis
            </Link>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY VERDICT PANEL */}
      <section className={`relative rounded-3xl border p-6 md:p-8 backdrop-blur-2xl transition-all ${verdictGlowClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Analysis Verdict
              </span>
              <span className="inline-block h-1 w-1 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-400">AI Classification Engine</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <RiskIndicator level={riskLevel} size="lg" />
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">
                {analysis.label}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Evaluated using <span className="font-mono text-slate-300">{analysis.model_name}</span>
            </p>
          </div>

          {/* Primary Telemetry Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Risk Level
              </p>
              <p className="mt-1 text-base font-bold text-white tracking-tight">{riskLevel}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Verdict tone: {tone}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Confidence
              </p>
              <p className="mt-1 text-base font-bold text-cyan-300 tracking-tight">
                {percent(analysis.confidence)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Model certainty</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Phishing Prob.
              </p>
              <p className="mt-1 text-base font-bold text-slate-200 tracking-tight">
                {analysis.phishing_probability !== null
                  ? formatPercent(analysis.phishing_probability)
                  : formatPercent(analysis.url_phishing_probability)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {analysis.phishing_probability !== null ? "Email probability" : "URL probability"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Indicators
              </p>
              <p className="mt-1 text-base font-bold text-slate-200 tracking-tight">
                {email.urls.length} URLs
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Extracted from body</p>
            </div>
          </div>
        </div>

        {/* 3. ANALYSIS SUMMARY / THREAT ASSESSMENT */}
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#080d19]/60 p-4">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Threat Assessment
            </h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Automated NLP threat classifier (<span className="font-mono text-cyan-300/90">{analysis.model_name}</span>) categorized this artifact as{" "}
            <span className="font-semibold text-white">{analysis.label}</span> with{" "}
            <span className="font-semibold text-cyan-300">{percent(analysis.confidence)}</span> model confidence.
            {analysis.url_phishing_probability !== null && (
              <>
                {" "}Embedded URL phishing risk score evaluated at{" "}
                <span className="font-mono text-slate-200">{formatPercent(analysis.url_phishing_probability)}</span> across {email.urls.length} indicator(s).
              </>
            )}
          </p>
        </div>
      </section>

      {/* TWO-COLUMN WORKSPACE ON DESKTOP */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN (8 cols): Email Overview, Threat Intelligence, Extracted Indicators */}
        <div className="space-y-8 lg:col-span-8">
          {/* 4. EMAIL OVERVIEW PANEL */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Mail size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Email Overview</h2>
                  <p className="text-xs text-slate-400">Authenticated RFC 822 message metadata</p>
                </div>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {formatBytes(email.raw_size)}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  From (Sender)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-slate-200" title={email.sender || "—"}>
                    {email.sender || "—"}
                  </span>
                  {email.sender && (
                    <button
                      type="button"
                      onClick={() => handleCopy(email.sender!, "sender")}
                      className="text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                      title="Copy sender"
                    >
                      {copiedKey === "sender" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  To (Recipients)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="truncate font-mono text-xs text-slate-200"
                    title={email.recipients?.join(", ") || "—"}
                  >
                    {email.recipients?.length ? email.recipients.join(", ") : "—"}
                  </span>
                  {email.recipients?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopy(email.recipients.join(", "), "recipients")}
                      className="text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                      title="Copy recipients"
                    >
                      {copiedKey === "recipients" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1 md:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Subject
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs text-slate-100 break-all">
                    {email.subject || "(no subject)"}
                  </span>
                  {email.subject && (
                    <button
                      type="button"
                      onClick={() => handleCopy(email.subject!, "subject")}
                      className="text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                      title="Copy subject"
                    >
                      {copiedKey === "subject" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Ingestion Timestamp
                </span>
                <p className="font-mono text-xs text-slate-200">{dateTime(email.created_at)}</p>
              </div>

              {email.sha256 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    SHA-256 Hash
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs text-slate-300" title={email.sha256}>
                      {email.sha256}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(email.sha256!, "sha256")}
                      className="text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                      title="Copy SHA-256"
                    >
                      {copiedKey === "sha256" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Optional RFC Headers if present in backend */}
              {email.headers && typeof email.headers === "object" && (
                <>
                  {email.headers["Reply-To"] && (
                    <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Reply-To
                      </span>
                      <p className="truncate font-mono text-xs text-slate-200">
                        {String(email.headers["Reply-To"])}
                      </p>
                    </div>
                  )}

                  {email.headers["Message-ID"] && (
                    <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1 md:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Message-ID
                      </span>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-mono text-xs text-slate-300" title={String(email.headers["Message-ID"])}>
                          {String(email.headers["Message-ID"])}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(email.headers!["Message-ID"]), "messageId")}
                          className="text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                          title="Copy Message-ID"
                        >
                          {copiedKey === "messageId" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* 5. THREAT INTELLIGENCE PANEL */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Radar size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Threat Intelligence</h2>
                <p className="text-xs text-slate-400">Machine learning threat classification telemetry</p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Primary Classification
                  </span>
                  <p className="mt-1 font-mono text-sm font-semibold text-white">{analysis.label}</p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Model Confidence
                  </span>
                  <p className="mt-1 font-mono text-sm font-semibold text-cyan-300">
                    {formatPercent(analysis.confidence)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    URL Phishing Risk
                  </span>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-200">
                    {formatPercent(analysis.url_phishing_probability)}
                  </p>
                </div>
              </div>

              {/* Class Probabilities Distribution */}
              {analysis.class_probabilities && Object.keys(analysis.class_probabilities).length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Class Probabilities Distribution
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    {Object.entries(analysis.class_probabilities).map(([className, prob]) => {
                      const percentageVal = Math.min(100, Math.max(0, prob * 100));
                      const isDominant = prob === Math.max(...Object.values(analysis.class_probabilities));
                      return (
                        <div key={className} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className={isDominant ? "text-cyan-300 font-semibold" : "text-slate-400"}>
                              {className}
                            </span>
                            <span className="text-slate-300">{(prob * 100).toFixed(2)}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isDominant
                                  ? "bg-gradient-to-r from-cyan-500 to-cyan-400"
                                  : "bg-slate-600/50"
                              }`}
                              style={{ width: `${percentageVal}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 6. EXTRACTED INDICATORS (Tabs: URLs, Domains, Hashes) */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Globe size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Extracted Indicators</h2>
                  <p className="text-xs text-slate-400">Indicators of compromise extracted from message content</p>
                </div>
              </div>

              {/* Segmented Controls: Only show tabs for categories with real backend data */}
              {availableIndicatorTabs.length > 0 && (
                <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#080d19]/80 p-1">
                  {availableIndicatorTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveIndicatorTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                        activeIndicatorTab === tab.id
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="rounded-full bg-white/[0.08] px-1.5 py-0.2 text-[10px] font-mono">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              {/* Tab 1: URLs */}
              {activeIndicatorTab === "urls" && (
                <div className="divide-y divide-white/[0.04]">
                  {email.urls.length > 0 ? (
                    email.urls.map((urlItem) => (
                      <div
                        key={urlItem.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                              URL
                            </span>
                            <span className="truncate font-mono text-xs text-slate-200" title={urlItem.url}>
                              {urlItem.url}
                            </span>
                          </div>
                          {urlItem.domain && (
                            <p className="text-[11px] text-slate-500">Domain: {urlItem.domain}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(urlItem.url, urlItem.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#080d19] px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all"
                            title="Copy URL"
                          >
                            {copiedKey === urlItem.id ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400 text-[11px]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={runningUrlId !== null}
                            onClick={() => handleStartForensics(urlItem.id)}
                            className="button-secondary text-xs shrink-0 py-1.5 px-3"
                          >
                            {runningUrlId === urlItem.id ? (
                              <>
                                <Refresh size={12} className="animate-spin" />
                                Investigating…
                              </>
                            ) : (
                              <>
                                <Globe size={12} />
                                Investigate URL
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No URLs were extracted from this message.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Domains */}
              {activeIndicatorTab === "domains" && (
                <div className="divide-y divide-white/[0.04]">
                  {uniqueDomains.length > 0 ? (
                    uniqueDomains.map((dom) => (
                      <div
                        key={dom}
                        className="flex items-center justify-between gap-3 py-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[10px] text-purple-300">
                            DOMAIN
                          </span>
                          <span className="font-mono text-xs text-slate-200">{dom}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(dom, `dom-${dom}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#080d19] px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all"
                        >
                          {copiedKey === `dom-${dom}` ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No domains available.
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Hashes */}
              {activeIndicatorTab === "hashes" && (
                <div className="divide-y divide-white/[0.04]">
                  {email.sha256 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                            SHA-256
                          </span>
                          <span className="font-mono text-xs text-slate-200 break-all">{email.sha256}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">RFC 822 raw message payload fingerprint</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(email.sha256!, "hash-tab")}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#080d19] px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:border-white/20 transition-all"
                      >
                        {copiedKey === "hash-tab" ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400 text-[11px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No hash fingerprints available.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* 7. SUSPICIOUS FINDINGS */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Suspicious Findings</h2>
                <p className="text-xs text-slate-400">Heuristics, threat scores, and anomalous indicators</p>
              </div>
            </div>

            <div className="mt-4">
              {tone === "malicious" || tone === "suspicious" ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-rose-200">
                          Elevated Threat Verdict: {analysis.label}
                        </h4>
                        <p className="text-xs text-rose-300/80 leading-relaxed">
                          The NLP classifier ({analysis.model_name}) identified pattern signatures matching {analysis.label} with {percent(analysis.confidence)} confidence.
                        </p>
                      </div>
                    </div>
                  </div>

                  {analysis.url_phishing_probability >= 0.5 && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-amber-200">
                            High-Risk Extracted URL Heuristic
                          </h4>
                          <p className="text-xs text-amber-300/80 leading-relaxed">
                            URL phishing probability evaluated at {formatPercent(analysis.url_phishing_probability)}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-4 text-xs text-emerald-300/90">
                  <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-300">No suspicious findings returned</span>
                    <p className="mt-0.5 text-slate-400">
                      Analysis pipeline detected no indicators of compromise or malicious heuristics in this artifact.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 8. EMAIL EVIDENCE (Strict zero script/HTML execution sandbox) */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Terminal size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Email Evidence</h2>
                  <p className="text-xs text-slate-400">Untrusted content rendered safely in sandboxed monospace view</p>
                </div>
              </div>

              {/* View switcher tabs */}
              <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#080d19]/80 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("body")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    activeEvidenceTab === "body"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Plaintext Body
                </button>
                {email.headers && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("headers")}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                      activeEvidenceTab === "headers"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Raw Headers
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4">
              {activeEvidenceTab === "body" ? (
                <div className="relative rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Message Body (Plaintext Sandbox)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(email.text_body || "", "bodyText")}
                      className="hover:text-cyan-300 transition-colors"
                    >
                      {copiedKey === "bodyText" ? "Copied!" : "Copy Text"}
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed selection:bg-cyan-500/20">
                    {email.text_body || "No plaintext body content in this message."}
                  </pre>
                </div>
              ) : (
                <div className="relative rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>RFC 822 Headers (JSON Structure)</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(email.headers || {}, null, 2), "headersJson")}
                      className="hover:text-cyan-300 transition-colors"
                    >
                      {copiedKey === "headersJson" ? "Copied!" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400 leading-relaxed">
                    {JSON.stringify(email.headers || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4 cols): Web Investigation, VLM/Forensic Status, Timeline, Technical Details */}
        <div className="space-y-8 lg:col-span-4">
          {/* 9. WEB INVESTIGATION (URL Forensics) */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Globe size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Web Investigation</h2>
                <p className="text-xs text-slate-400">Headless sandbox forensics & DOM analysis</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracted URLs can be analyzed using deep browser sandboxing, screenshot capture, DOM analysis, and threat intelligence fusion.
              </p>

              {forensicStage && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-200">
                  <div className="flex items-center gap-2">
                    <Refresh size={12} className="animate-spin text-cyan-400" />
                    <span>{forensicStage}</span>
                  </div>
                </div>
              )}

              {forensicError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {forensicError}
                </div>
              )}

              <div className="space-y-2.5">
                {email.urls.length > 0 ? (
                  email.urls.map((u) => {
                    const isLinked = linkedRun && linkedRun.email_url_id === u.id;
                    return (
                      <div key={u.id} className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-xs text-cyan-300" title={u.url}>
                            {u.url}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-500">{u.domain || "—"}</span>
                          {isLinked ? (
                            <Link
                              to={`/forensics/${linkedRun.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                            >
                              <span>View Forensics</span>
                              <ExternalLink size={10} />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={runningUrlId !== null}
                              onClick={() => handleStartForensics(u.id)}
                              className="button-secondary text-xs py-1 px-2.5"
                            >
                              {runningUrlId === u.id ? "Analyzing…" : "Run Forensics"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No URLs available for web forensics.</p>
                )}
              </div>
            </div>
          </section>

          {/* 10 & 11. VISUAL THREAT ANALYSIS & FORENSIC STATUS */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Shield size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Forensic & VLM Status</h2>
                <p className="text-xs text-slate-400">Vision model & sandbox execution state</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {linkedRun ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Forensic Status</span>
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-cyan-300">
                        {linkedRun.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Risk Score</span>
                      <span className="font-mono text-xs font-semibold text-white">
                        {linkedRun.risk_score}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Run Verdict</span>
                      <RiskIndicator level={linkedRun.verdict} size="sm" />
                    </div>
                  </div>

                  <Link
                    to={`/forensics/${linkedRun.id}`}
                    className="block text-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
                  >
                    Open Forensics Report →
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4 text-xs text-slate-400 leading-relaxed">
                  <p>
                    Visual threat analysis with VLM is executed during Web Forensics. Run forensics on an extracted URL to capture browser screenshots and vision model threat evaluations.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                    <span>Status: Not Started</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 12. ANALYSIS TIMELINE */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Clock size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Investigation Timeline</h2>
                <p className="text-xs text-slate-400">Real verified backend event timestamps</p>
              </div>
            </div>

            <div className="mt-4 relative pl-4 border-l border-white/[0.08] space-y-6">
              {/* Event 1: Message Ingested */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-4 ring-[#080d19]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">Email Ingested & Parsed</p>
                  <p className="text-[11px] font-mono text-slate-400">{dateTime(email.created_at)}</p>
                  <p className="text-[10px] text-slate-500">Original RFC 822 payload parsed</p>
                </div>
              </div>

              {/* Event 2: Analysis Completed */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-4 ring-[#080d19]" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">AI Threat Analysis Completed</p>
                  <p className="text-[11px] font-mono text-slate-400">{dateTime(analysis.created_at)}</p>
                  <p className="text-[10px] text-slate-500">Model: {analysis.model_name}</p>
                </div>
              </div>

              {/* Event 3: Forensics Executed (only if real run exists) */}
              {linkedRun && (
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-purple-400 ring-4 ring-[#080d19]" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-slate-200">Web Forensics Executed</p>
                    <p className="text-[11px] font-mono text-slate-400">{dateTime(linkedRun.created_at)}</p>
                    <p className="text-[10px] text-slate-500">Verdict: {linkedRun.verdict}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 13. TECHNICAL DETAILS (Collapsible) */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-colors">
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-cyan-400" />
                  <span>Technical Details</span>
                </div>
                <span className="text-[11px] text-slate-500 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>

              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Analysis UUID</span>
                  <span className="font-mono text-[11px] text-slate-300">{analysis.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email UUID</span>
                  <span className="font-mono text-[11px] text-slate-300">{analysis.email_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Payload Size</span>
                  <span className="font-mono text-[11px] text-slate-300">{formatBytes(email.raw_size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Header Count</span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {email.headers ? Object.keys(email.headers).length : 0}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="w-full text-center rounded-xl border border-white/[0.08] bg-[#080d19] py-1.5 text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    {showRawJson ? "Hide Raw JSON" : "Show Raw JSON"}
                  </button>

                  {showRawJson && (
                    <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#080d19] p-3 font-mono text-[10px] text-slate-400 leading-relaxed">
                      {JSON.stringify({ analysis, email }, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </details>
          </section>
        </div>
      </div>

      {/* 14. BOTTOM ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/[0.08] bg-[#0c1527]/50 p-4 backdrop-blur-xl">
        <Link
          to="/email-analysis"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Email Analysis
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCopy(analysis.id, "bottomId")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080d19]/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            {copiedKey === "bottomId" ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Analysis ID</span>
              </>
            )}
          </button>

          <Link
            to="/email-analysis"
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all"
          >
            <Mail size={13} />
            Start New Analysis
          </Link>
        </div>
      </div>
    </div>
  );
}
