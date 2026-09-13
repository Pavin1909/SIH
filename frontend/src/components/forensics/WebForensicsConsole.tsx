import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../../api";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Code,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Radar,
  Refresh,
  Search,
  Shield,
  Terminal,
  XCircle,
} from "../icons";
import { RiskIndicator } from "../ui/RiskIndicator";
import { Badge } from "../ui/Badge";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import type { ForensicRun, InfrastructureObservation, ProviderObservation } from "../../types";
import { dateTime, verdictTone } from "../../utils";

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

interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: "completed" | "active" | "unavailable" | "failed";
  detail?: string;
}

export function WebForensicsConsole() {
  const { runId = "" } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  // Core Data States
  const [run, setRun] = useState<ForensicRun | null>(cache.get<ForensicRun>("lastRun"));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<boolean>(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);

  // Interaction States
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dom" | "js" | "network">("dom");
  const [showRawEvidence, setShowRawEvidence] = useState<boolean>(false);

  // Load Forensics Data
  const loadForensics = async () => {
    if (!runId) {
      setError("No forensic run identifier specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await api.forensics(runId);
      setRun(result);
      cache.set("lastRun", result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to load forensic investigation."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForensics();
  }, [runId]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Enrich Infrastructure Action
  const handleEnrich = async () => {
    if (!runId) return;
    setEnriching(true);
    setEnrichMessage("Requesting live infrastructure enrichment (DNS, Whois, GeoIP)…");
    try {
      const updated = await api.enrich(runId);
      setRun(updated);
      cache.set("lastRun", updated);
      setEnrichMessage("Enrichment complete! Navigating to infrastructure view…");
      setTimeout(() => {
        navigate(`/infrastructure/${runId}`);
      }, 800);
    } catch (err) {
      setEnrichMessage(
        err instanceof Error
          ? `Enrichment failed: ${err.message}`
          : "Enrichment failed. Ensure Phase 3 access is configured."
      );
    } finally {
      setEnriching(false);
    }
  };

  // 15. Loading State
  if (loading && !run) {
    return (
      <div className="py-16">
        <LoadingState message="Loading webpage forensic telemetry…" />
      </div>
    );
  }

  // 16. Error State
  if (error && !run) {
    return (
      <div className="py-16">
        <ErrorState
          title="Forensics Unavailable"
          message={error}
          retry={loadForensics}
        />
        <div className="mt-6 text-center">
          <Link
            to="/email-analysis"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Email Analysis
          </Link>
        </div>
      </div>
    );
  }

  if (!run) {
    return null;
  }

  // Extract VLM provider observation
  const vlm = run.provider_observations?.find((p) => p.provider === "vlm");
  const vlmResponse = (vlm?.response || {}) as Record<string, unknown>;
  const vlmError = vlmResponse.error || vlmResponse.detail || vlmResponse.message;

  // Extract infrastructure observation if present
  const infraObservations = Array.isArray(run.fused_evidence?.infrastructure)
    ? (run.fused_evidence.infrastructure as InfrastructureObservation[])
    : [];
  const primaryInfra = infraObservations[0];

  // Pipeline Stages Calculation
  const pipelineStages: PipelineStage[] = [
    {
      id: "url",
      name: "URL Ingestion",
      description: "Target URL extracted",
      status: "completed",
      detail: run.url,
    },
    {
      id: "rendering",
      name: "Browser Rendering",
      description: "Playwright headless sandbox",
      status: run.browser_observation ? "completed" : "failed",
      detail: run.browser_observation?.final_url || undefined,
    },
    {
      id: "screenshot",
      name: "Screenshot Capture",
      description: "Viewport rasterization",
      status: run.browser_observation?.screenshot_available ? "completed" : "unavailable",
      detail: run.browser_observation?.screenshot_available ? "Captured" : "Not captured",
    },
    {
      id: "vlm",
      name: "VLM Analysis",
      description: "Visual AI threat model",
      status:
        vlm?.status === "completed" || vlm?.status === "ok"
          ? "completed"
          : vlm?.status === "failed" || vlm?.status === "error"
          ? "failed"
          : "unavailable",
      detail: vlm ? String(vlm.status) : "Not executed",
    },
    {
      id: "threat_intel",
      name: "Threat Intelligence",
      description: "Provider observations",
      status: run.provider_observations?.length > 0 ? "completed" : "unavailable",
      detail: `${run.provider_observations?.length || 0} provider(s)`,
    },
    {
      id: "fusion",
      name: "Evidence Fusion",
      description: "Cross-modal risk engine",
      status: run.fused_evidence ? "completed" : "unavailable",
      detail: `Risk ${run.risk_score}/100`,
    },
    {
      id: "verdict",
      name: "Final Verdict",
      description: "Decision synthesis",
      status: run.verdict ? "completed" : "active",
      detail: run.verdict,
    },
  ];

  const tone = verdictTone(run.verdict);
  const verdictGlowClass = {
    safe: "border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.12)] bg-gradient-to-b from-emerald-950/20 via-[#0c1527]/70 to-[#080d19]/90",
    suspicious: "border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.12)] bg-gradient-to-b from-amber-950/20 via-[#0c1527]/70 to-[#080d19]/90",
    malicious: "border-rose-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] bg-gradient-to-b from-rose-950/25 via-[#0c1527]/70 to-[#080d19]/90",
    neutral: "border-white/[0.08] shadow-[0_0_40px_rgba(0,0,0,0.3)] bg-gradient-to-b from-slate-900/30 via-[#0c1527]/70 to-[#080d19]/90",
  }[tone];

  // Normalized evidence signals
  const signals = Array.isArray(run.fused_evidence?.signals)
    ? (run.fused_evidence.signals as unknown[])
    : [];

  return (
    <div className="space-y-8 pb-16">
      {/* 1. INVESTIGATION HEADER */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link
                to={`/analyses/${run.analysis_id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft size={13} />
                Back to Analysis
              </Link>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                <Radar size={11} />
                Headless Sandbox Forensics
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Webpage Forensics
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-400">
              <span>Target:</span>
              <span className="truncate max-w-md font-mono text-cyan-300/90" title={run.url}>
                {run.url}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(run.url, "targetUrl")}
                className="inline-flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300 hover:text-white transition-colors"
                title="Copy Target URL"
              >
                {copiedKey === "targetUrl" ? (
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
              disabled={enriching}
              onClick={handleEnrich}
              className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:bg-cyan-500/25 transition-all"
            >
              {enriching ? (
                <>
                  <Refresh size={13} className="animate-spin" />
                  Enriching…
                </>
              ) : (
                <>
                  <Globe size={13} />
                  Enrich Infrastructure
                </>
              )}
            </button>

            <Link
              to={`/infrastructure/${run.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080d19]/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 transition-all"
            >
              <FileText size={13} />
              View Infrastructure
            </Link>

            <button
              type="button"
              onClick={loadForensics}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080d19]/80 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition-all"
              title="Refresh Forensics"
            >
              <Refresh size={13} />
            </button>
          </div>
        </div>

        {enrichMessage && (
          <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-200">
            {enrichMessage}
          </div>
        )}
      </div>

      {/* 2. PRIMARY VERDICT & RISK SUMMARY PANEL */}
      <section className={`relative rounded-3xl border p-6 md:p-8 backdrop-blur-2xl transition-all ${verdictGlowClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Forensic Verdict
              </span>
              <span className="inline-block h-1 w-1 rounded-full bg-slate-500" />
              <span className="text-xs text-slate-400">Multi-Modal Threat Synthesis</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <RiskIndicator level={run.verdict} size="lg" />
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">
                Status: {run.status}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Analysis Run ID: <span className="font-mono text-slate-300">{run.id}</span>
            </p>
          </div>

          {/* Primary Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Risk Score
              </p>
              <p className="mt-1 text-xl font-bold text-white tracking-tight">
                {run.risk_score}<span className="text-xs text-slate-500 font-normal">/100</span>
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Evaluated threat</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Visual AI / VLM
              </p>
              <p className="mt-1 text-base font-bold text-cyan-300 tracking-tight capitalize">
                {vlm?.status || "Unavailable"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Vision model</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Screenshot
              </p>
              <p className="mt-1 text-base font-bold text-slate-200 tracking-tight">
                {run.browser_observation?.screenshot_available ? "Captured" : "Unavailable"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Headless browser</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080d19]/80 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Providers
              </p>
              <p className="mt-1 text-base font-bold text-slate-200 tracking-tight">
                {run.provider_observations?.length || 0} active
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Live intelligence</p>
            </div>
          </div>
        </div>

        {/* Normalized Signals */}
        {signals.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Normalized Evidence Signals:
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {signals.map((sig) => (
                <span
                  key={String(sig)}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono text-cyan-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  {String(sig).replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. INVESTIGATION PIPELINE VISUALIZER */}
      <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity size={16} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Investigation Pipeline</h2>
              <p className="text-xs text-slate-400">Multi-stage autonomous forensic collection pipeline</p>
            </div>
          </div>
          <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-mono text-slate-400">
            {pipelineStages.filter((s) => s.status === "completed").length} / {pipelineStages.length} Stages Complete
          </span>
        </div>

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="min-w-[760px] flex items-center justify-between relative">
            {/* Connecting Track */}
            <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-800 -z-0" />

            {pipelineStages.map((stage, index) => {
              const isCompleted = stage.status === "completed";
              const isFailed = stage.status === "failed";
              const isUnavailable = stage.status === "unavailable";

              return (
                <div key={stage.id} className="relative z-10 flex flex-col items-center text-center px-2 flex-1">
                  {/* Stage Node Icon */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all ${
                      isCompleted
                        ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-4 ring-[#0c1527]"
                        : isFailed
                        ? "border-rose-500/40 bg-rose-950/80 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] ring-4 ring-[#0c1527]"
                        : "border-slate-700 bg-slate-900/80 text-slate-500 ring-4 ring-[#0c1527]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : isFailed ? (
                      <XCircle size={16} />
                    ) : (
                      <span className="text-xs font-mono">{index + 1}</span>
                    )}
                  </div>

                  {/* Stage Details */}
                  <div className="mt-3 space-y-0.5">
                    <p className={`text-xs font-semibold ${isCompleted ? "text-slate-200" : "text-slate-400"}`}>
                      {stage.name}
                    </p>
                    <p className="text-[10px] text-slate-500">{stage.description}</p>
                    {stage.detail && (
                      <span
                        className={`inline-block mt-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-300"
                            : isFailed
                            ? "bg-rose-500/10 text-rose-300"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {stage.detail}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TWO-COLUMN MAIN WORKSPACE */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN (7 cols): Screenshot Showcase & VLM Analysis */}
        <div className="space-y-8 lg:col-span-7">
          {/* 4. RENDERED WEBPAGE SCREENSHOT SHOWCASE */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Globe size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Rendered Webpage</h2>
                  <p className="text-xs text-slate-400">Automated sandbox browser viewport capture</p>
                </div>
              </div>
              <Badge
                value={
                  run.browser_observation?.screenshot_available
                    ? "Screenshot Captured"
                    : "Screenshot Unavailable"
                }
              />
            </div>

            <div className="mt-5">
              {/* Browser Mockup Window */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#080d19] overflow-hidden shadow-2xl">
                {/* Browser Chrome Header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0b1325] px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="flex-1 max-w-md mx-auto rounded-lg border border-white/[0.06] bg-[#080d19]/80 px-3 py-1 flex items-center justify-between text-[11px] font-mono text-slate-400 truncate">
                    <span className="truncate">{run.browser_observation?.final_url || run.url}</span>
                    <Shield size={12} className="text-cyan-400 shrink-0 ml-2" />
                  </div>
                  <div className="w-12 text-right text-[10px] text-slate-500 font-mono">
                    1280×720
                  </div>
                </div>

                {/* Viewport Content */}
                <div className="p-4 bg-[#050814] min-h-[280px] flex items-center justify-center">
                  {(run.browser_observation as Record<string, unknown>)?.screenshot_base64 ? (
                    <img
                      src={`data:image/png;base64,${(run.browser_observation as Record<string, unknown>).screenshot_base64}`}
                      alt="Rendered Webpage Screenshot"
                      className="rounded-lg max-h-[420px] w-full object-contain border border-white/[0.06]"
                    />
                  ) : run.browser_observation?.screenshot_available ? (
                    <div className="text-center p-8 space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                        <CheckCircle size={24} />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">
                        Screenshot Captured in Sandbox
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Headless Playwright browser successfully captured and analyzed the visual DOM during execution.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-8 space-y-2">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/60 text-slate-500">
                        <Globe size={24} />
                      </div>
                      <p className="text-xs font-semibold text-slate-300">
                        Screenshot Unavailable
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Target endpoint did not complete visual rasterization before connection timeout or navigation redirected.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 5. VISUAL AI / VLM ANALYSIS */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Shield size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Visual AI / VLM Analysis</h2>
                  <p className="text-xs text-slate-400">Computer vision credential harvesting & brand impersonation inspection</p>
                </div>
              </div>
              <Badge value={vlm?.status || "Unavailable"} />
            </div>

            <div className="mt-5 space-y-4">
              {vlm ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Vision Model Provider
                      </span>
                      <p className="font-mono text-xs text-slate-200">
                        {String(vlmResponse.model || vlmResponse.provider || "Ollama / LLaVA Vision")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Model Verdict
                      </span>
                      <p className="font-mono text-xs text-cyan-300 font-semibold uppercase">
                        {String(vlmResponse.verdict || vlmResponse.label || vlm.status)}
                      </p>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4 space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      VLM Findings & Assessment
                    </span>
                    <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                      {String(
                        vlmResponse.findings ||
                        vlmResponse.explanation ||
                        vlmResponse.detail ||
                        (vlmError ? `VLM Notice: ${vlmError}` : "No textual visual threat findings reported by model.")
                      )}
                    </p>
                  </div>

                  {vlmError && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
                      <strong>VLM Provider Telemetry:</strong> {String(vlmError)}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-6 text-center text-xs text-slate-500">
                  Visual AI analysis was not executed for this run.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): Browser Evidence & Threat Intelligence */}
        <div className="space-y-8 lg:col-span-5">
          {/* 6. BROWSER EVIDENCE */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Terminal size={16} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">Browser Evidence</h2>
                <p className="text-xs text-slate-400">DOM signals, redirects, and network observations</p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Redirect Hops
                  </span>
                  <p className="mt-1 text-base font-bold text-slate-100">
                    {run.browser_observation?.redirect_chain?.length || 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Domains Contacted
                  </span>
                  <p className="mt-1 text-base font-bold text-slate-100">
                    {run.browser_observation?.domains?.length || 0}
                  </p>
                </div>
              </div>

              {/* Redirect Chain */}
              {run.browser_observation?.redirect_chain && run.browser_observation.redirect_chain.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Redirect Path
                  </span>
                  <div className="space-y-1.5">
                    {run.browser_observation.redirect_chain.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-mono text-slate-300">
                        <span className="text-cyan-400 shrink-0 font-bold">{idx + 1}.</span>
                        <span className="truncate" title={step}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final URL */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Final Resolved URL
                </span>
                <p className="truncate font-mono text-xs text-cyan-300" title={run.browser_observation?.final_url || run.url}>
                  {run.browser_observation?.final_url || run.url}
                </p>
              </div>

              {/* DOM / JS Tabs */}
              <div className="space-y-2">
                <div className="flex rounded-xl border border-white/[0.08] bg-[#080d19]/80 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dom")}
                    className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                      activeTab === "dom"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    DOM Signals
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("js")}
                    className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                      activeTab === "js"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    JavaScript Signals
                  </button>
                </div>

                {activeTab === "dom" ? (
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3 font-mono text-[11px] text-slate-300 leading-relaxed">
                    {JSON.stringify(run.browser_observation?.dom_signals || {}, null, 2)}
                  </pre>
                ) : (
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3 font-mono text-[11px] text-slate-300 leading-relaxed">
                    {JSON.stringify(run.browser_observation?.javascript_signals || {}, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </section>

          {/* 7. THREAT INTELLIGENCE & PROVIDER OBSERVATIONS */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Radar size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Provider Observations</h2>
                  <p className="text-xs text-slate-400">External threat feeds & sensor responses</p>
                </div>
              </div>
              <Link
                to={`/infrastructure/${run.id}`}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Full Intel →
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {run.provider_observations?.length ? (
                run.provider_observations.map((item) => (
                  <div key={item.provider} className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="capitalize text-xs text-slate-200 font-semibold">
                        {item.provider}
                      </strong>
                      <Badge value={item.status} />
                    </div>
                    <details className="text-[11px]">
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
                        View telemetry response
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.04] bg-black/40 p-2 text-[10px] text-slate-400 font-mono">
                        {JSON.stringify(item.response || {}, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  No provider observations available.
                </div>
              )}
            </div>
          </section>

          {/* 8. RAW EVIDENCE (Collapsible) */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-colors">
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-cyan-400" />
                  <span>Technical Evidence JSON</span>
                </div>
                <span className="text-[11px] text-slate-500 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>

              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Forensic Run UUID</span>
                  <span className="font-mono text-[11px] text-slate-300">{run.id}</span>
                </div>
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-[#080d19] p-3 font-mono text-[10px] text-slate-400 leading-relaxed">
                  {JSON.stringify(run.fused_evidence, null, 2)}
                </pre>
              </div>
            </details>
          </section>
        </div>
      </div>

      {/* 9. BOTTOM ACTION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/[0.08] bg-[#0c1527]/50 p-4 backdrop-blur-xl">
        <Link
          to={`/analyses/${run.analysis_id}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Analysis
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleCopy(run.id, "runId")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#080d19]/80 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            {copiedKey === "runId" ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Run ID</span>
              </>
            )}
          </button>

          <Link
            to={`/infrastructure/${run.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all"
          >
            <Globe size={13} />
            View Infrastructure
          </Link>
        </div>
      </div>
    </div>
  );
}
