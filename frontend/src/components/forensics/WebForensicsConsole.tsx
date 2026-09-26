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
import { ArchiveFrame } from "../archive/ArchiveFrame";
import { ClassificationSeal } from "../archive/ClassificationSeal";
import { OrnamentalDivider } from "../archive/OrnamentalDivider";
import { ErrorState } from "../ui/ErrorState";
import { LoadingState } from "../ui/LoadingState";
import type { ForensicRun, InfrastructureObservation, ProviderObservation } from "../../types";
import { dateTime, saveInvestigationId, verdictTone } from "../../utils";

interface PipelineStage {
  id: string;
  stepNumber: string;
  name: string;
  description: string;
  status: "completed" | "active" | "unavailable" | "failed";
  detail?: string;
}

export function WebForensicsConsole() {
  const { runId = "" } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  // Core Data States
  const [run, setRun] = useState<ForensicRun | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState<boolean>(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);

  // Interaction States
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dom" | "js" | "network">("dom");
  const [specimenView, setSpecimenView] = useState<"viewport" | "dom" | "metadata">("viewport");
  const [showRawVlm, setShowRawVlm] = useState<boolean>(false);
  const [showRawLogs, setShowRawLogs] = useState<boolean>(false);
  const [showRawEvidence, setShowRawEvidence] = useState<boolean>(false);

  const loadForensics = async () => {
    setRun(null);
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
      saveInvestigationId(result.id);
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

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleEnrich = async () => {
    if (!runId) return;
    setEnriching(true);
    setEnrichMessage("Requesting live cartographic infrastructure enrichment (DNS, Whois, GeoIP)…");
    try {
      const updated = await api.enrich(runId);
      setRun(updated);
      setEnrichMessage("Enrichment complete! Navigating to threat atlas…");
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

  if (loading && !run) {
    return (
      <div className="py-16">
        <LoadingState message="Consulting forensic intelligence dossier…" />
      </div>
    );
  }

  if (error && !run) {
    return (
      <div className="py-16">
        <ErrorState
          title="Dossier Unavailable"
          message={error}
          retry={loadForensics}
        />
        <div className="mt-6 text-center">
          <Link
            to="/email-analysis"
            className="inline-flex items-center gap-2 font-serif text-xs text-[#a498b2] hover:text-[#dfc28d] transition-colors"
          >
            <ArrowLeft size={14} />
            Return to Email Cases
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

  // Forensic Investigation Timeline Stages
  const pipelineStages: PipelineStage[] = [
    {
      id: "url",
      stepNumber: "01",
      name: "Source",
      description: "Target URL extracted",
      status: "completed",
      detail: run.url,
    },
    {
      id: "rendering",
      stepNumber: "02",
      name: "Redirect",
      description: "Playwright headless sandbox",
      status: run.browser_observation ? "completed" : "failed",
      detail: run.browser_observation?.final_url || undefined,
    },
    {
      id: "screenshot",
      stepNumber: "03",
      name: "Domain",
      description: "Viewport specimen raster",
      status: run.browser_observation?.screenshot_available ? "completed" : "unavailable",
      detail: run.browser_observation?.screenshot_available ? "Captured" : "Not captured",
    },
    {
      id: "vlm",
      stepNumber: "04",
      name: "Network",
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
      stepNumber: "05",
      name: "Behavior",
      description: "Provider observations",
      status: run.provider_observations?.length > 0 ? "completed" : "unavailable",
      detail: `${run.provider_observations?.length || 0} provider(s)`,
    },
    {
      id: "fusion",
      stepNumber: "06",
      name: "Evidence",
      description: "Cross-modal risk engine",
      status: run.fused_evidence ? "completed" : "unavailable",
      detail: `Risk ${run.risk_score}/100`,
    },
    {
      id: "verdict",
      stepNumber: "07",
      name: "Verdict",
      description: "Decision synthesis",
      status: run.verdict ? "completed" : "active",
      detail: run.verdict,
    },
  ];

  const tone = verdictTone(run.verdict);
  const verdictGlowClass = {
    safe: "border-[#558f70]/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#14261d]/85 via-[#181124]/90 to-[#120c1a]",
    suspicious: "border-[#e2a554]/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#291c0a]/85 via-[#181124]/90 to-[#120c1a]",
    malicious: "border-[#b4384d]/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#2c1218]/85 via-[#181124]/90 to-[#120c1a]",
    neutral: "border-[#c8a96e]/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#1f162e]/85 via-[#181124]/90 to-[#120c1a]",
  }[tone];

  const signals = Array.isArray(run.fused_evidence?.signals)
    ? (run.fused_evidence.signals as unknown[])
    : [];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* =========================================================================
          1. INVESTIGATION DOSSIER HEADER
          ========================================================================= */}
      <div className="relative rounded-xl border border-[#c8a96e]/30 bg-[#161122]/90 p-6 backdrop-blur-xl shadow-lg">
        <span className="pointer-events-none absolute top-2 left-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>
        <span className="pointer-events-none absolute top-2 right-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/analyses/${run.analysis_id}`}
                className="inline-flex items-center gap-1.5 font-serif text-xs font-semibold text-[#a498b2] hover:text-[#dfc28d] transition-colors"
              >
                <ArrowLeft size={13} />
                Back to Case File
              </Link>
              <span className="text-[#c8a96e]/40">•</span>
              <span className="font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
                Chapter 03 • Domain Dossier
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#f5ebd9] sm:text-3xl">
              Forensic Specimen Dossier
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-[#a498b2]">
              <span className="font-serif font-bold text-[#c8a96e]">TARGET:</span>
              <span className="truncate max-w-md font-mono text-xs text-[#f0e6d6]" title={run.url}>
                {run.url}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(run.url, "targetUrl")}
                className="button-secondary text-[10px] py-0.5 px-2"
                title="Copy Target URL"
              >
                {copiedKey === "targetUrl" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={enriching}
              onClick={handleEnrich}
              className="button text-xs py-2 px-3.5"
            >
              {enriching ? (
                <>
                  <Refresh size={13} className="animate-spin text-[#dfc28d]" />
                  Enriching…
                </>
              ) : (
                <>
                  <Globe size={13} className="text-[#dfc28d]" />
                  Enrich Threat Atlas
                </>
              )}
            </button>

            <Link
              to={`/infrastructure/${run.id}`}
              className="button-secondary text-xs py-2 px-3.5"
            >
              <FileText size={13} />
              View Threat Atlas
            </Link>

            <button
              type="button"
              onClick={loadForensics}
              className="button-secondary text-xs p-2"
              title="Refresh Dossier"
            >
              <Refresh size={13} />
            </button>
          </div>
        </div>

        {enrichMessage && (
          <div className="mt-4 rounded-lg border border-[#c8a96e]/30 bg-[#251b33] p-3 font-serif text-xs text-[#dfc28d]">
            {enrichMessage}
          </div>
        )}
      </div>

      {/* =========================================================================
          2. PRIMARY VERDICT & RISK SUMMARY (Classification Seal)
          ========================================================================= */}
      <section className={`relative rounded-xl border p-6 md:p-8 backdrop-blur-2xl transition-all ${verdictGlowClass}`}>
        <span className="pointer-events-none absolute top-2 left-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>
        <span className="pointer-events-none absolute top-2 right-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[10px] font-bold uppercase tracking-widest text-[#a498b2]">
                Official Forensic Determination
              </span>
              <span className="text-[#c8a96e]/40">•</span>
              <span className="font-serif text-xs text-[#dfc28d]">Multi-Engine Synthesis</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ClassificationSeal
                verdict={run.verdict}
                score={run.risk_score}
                size="md"
                subtitle="Synthesized Verdict"
              />
              <span className="font-serif rounded-lg border border-[#c8a96e]/30 bg-[#161022] px-3 py-1 text-xs font-bold text-[#dfc28d]">
                STATUS: {run.status.toUpperCase()}
              </span>
            </div>

            <p className="font-mono text-xs text-[#a498b2]">
              CASE RUN ID: {run.id}
            </p>
          </div>

          {/* Primary Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 shrink-0">
            <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3.5">
              <p className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                Risk Score
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-[#f5ebd9] tracking-tight">
                {run.risk_score}<span className="text-xs text-[#8d809c] font-normal">/100</span>
              </p>
            </div>

            <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3.5">
              <p className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                Vision / VLM
              </p>
              <p className="mt-1 font-serif text-base font-bold text-[#dfc28d] capitalize">
                {vlm?.status || "Unavailable"}
              </p>
            </div>

            <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3.5">
              <p className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                Specimen
              </p>
              <p className="mt-1 font-serif text-base font-bold text-[#e8e1d5]">
                {run.browser_observation?.screenshot_available ? "Captured" : "Unavailable"}
              </p>
            </div>

            <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3.5">
              <p className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                Providers
              </p>
              <p className="mt-1 font-serif text-base font-bold text-[#e8e1d5]">
                {run.provider_observations?.length || 0} active
              </p>
            </div>
          </div>
        </div>

        {/* Normalized Signals */}
        {signals.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[#c8a96e]/15">
            <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#dfc28d]">
              Collected Forensic Signals:
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {signals.map((sig) => (
                <span
                  key={String(sig)}
                  className="inline-flex items-center gap-1.5 rounded border border-[#c8a96e]/30 bg-[#251b33] px-3 py-1 font-mono text-xs text-[#f0e6d6]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#dfc28d]" />
                  {String(sig).replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          3. FORENSIC INVESTIGATION TIMELINE
          ========================================================================= */}
      <ArchiveFrame
        title="Forensic Investigation Timeline"
        subtitle="Chronological chapter sequence executed by the autonomous investigation engine."
        referenceId="TIMELINE // SEQUENCE 01-07"
      >
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px] flex items-center justify-between relative py-2">
            {/* Connecting Manuscript Line */}
            <div className="absolute top-7 left-8 right-8 h-[1px] bg-gradient-to-r from-[#c8a96e]/20 via-[#c8a96e]/40 to-[#c8a96e]/20 z-0" />

            {pipelineStages.map((stage) => {
              const isCompleted = stage.status === "completed";
              const isFailed = stage.status === "failed";

              return (
                <div key={stage.id} className="relative z-10 flex flex-col items-center text-center px-2 flex-1">
                  {/* Stage Node */}
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? "border-[#dfc28d] bg-[#291c36] text-[#dfc28d] shadow-sm"
                        : isFailed
                        ? "border-[#b4384d] bg-[#2a131b] text-[#ff8a9a]"
                        : "border-[#c8a96e]/30 bg-[#161122] text-[#7a6f87]"
                    }`}
                  >
                    <span className="font-serif text-xs font-bold">{stage.stepNumber}</span>
                  </div>

                  {/* Stage Label */}
                  <div className="mt-3 space-y-0.5">
                    <span
                      className={`font-serif text-xs font-bold tracking-wide uppercase ${
                        isCompleted ? "text-[#dfc28d]" : isFailed ? "text-[#ff8a9a]" : "text-[#7a6f87]"
                      }`}
                    >
                      {stage.name}
                    </span>
                    <p className="text-[10px] text-[#a498b2] max-w-[100px] truncate mx-auto">
                      {stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ArchiveFrame>

      {/* =========================================================================
          4. SPECIMEN ARTIFACT: RENDERED WEBPAGE SCREENSHOT & VIEWPORT
          ========================================================================= */}
      <ArchiveFrame
        title="Specimen Artifact: Rendered Webpage"
        subtitle="Visual capture produced inside the isolated Playwright browser sandbox."
        referenceId="SPECIMEN // ARTIFACT PLATE"
      >
        {run.browser_observation ? (() => {
          const browserObs = run.browser_observation;
          const htmlContent = browserObs.html || "";

          return (
            <div className="space-y-4">
              {/* Archival Browser Chrome Frame */}
              <div className="rounded-xl border border-[#c8a96e]/30 bg-[#120d1a] shadow-2xl overflow-hidden">
                {/* Browser Address & Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c8a96e]/20 bg-[#181124] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#8c2535] opacity-80" />
                    <span className="h-3 w-3 rounded-full bg-[#dfc28d] opacity-80" />
                    <span className="h-3 w-3 rounded-full bg-[#558f70] opacity-80" />
                  </div>

                  {/* URL Address Bar */}
                  <div className="flex flex-1 max-w-xl items-center gap-2 rounded-lg border border-[#c8a96e]/20 bg-[#0e0a16] px-3 py-1 font-mono text-xs text-[#f0e6d6]">
                    <Shield size={12} className="text-[#558f70] shrink-0" />
                    <span className="truncate flex-1" title={browserObs.final_url || run.url}>
                      {browserObs.final_url || run.url}
                    </span>
                    <span className="rounded bg-[#558f70]/20 px-1.5 py-0.5 text-[9px] font-sans font-bold text-[#a8e6cf] uppercase">
                      HTTPS
                    </span>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center gap-1 text-[11px] font-serif">
                    <button
                      type="button"
                      onClick={() => setSpecimenView("viewport")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        specimenView === "viewport"
                          ? "bg-[#291c38] text-[#dfc28d] border border-[#c8a96e]/40 font-bold"
                          : "text-[#a498b2] hover:text-[#f5ebd9]"
                      }`}
                    >
                      Specimen Viewport
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecimenView("dom")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        specimenView === "dom"
                          ? "bg-[#291c38] text-[#dfc28d] border border-[#c8a96e]/40 font-bold"
                          : "text-[#a498b2] hover:text-[#f5ebd9]"
                      }`}
                    >
                      Captured HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecimenView("metadata")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        specimenView === "metadata"
                          ? "bg-[#291c38] text-[#dfc28d] border border-[#c8a96e]/40 font-bold"
                          : "text-[#a498b2] hover:text-[#f5ebd9]"
                      }`}
                    >
                      Capture Telemetry
                    </button>
                  </div>
                </div>

                {/* Viewport Content */}
                <div className="p-3 bg-[#0a0610]">
                  {specimenView === "viewport" && (
                    htmlContent ? (
                      <div className="relative">
                        <iframe
                          sandbox="allow-same-origin"
                          srcDoc={htmlContent}
                          title={`Rendered viewport of ${run.url}`}
                          className="w-full h-[520px] rounded border border-[#c8a96e]/15 bg-white shadow-inner"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
                        <Globe size={28} className="text-[#c8a96e]" />
                        <h4 className="font-serif text-sm font-bold text-[#dfc28d]">
                          Sandbox Capture Recorded
                        </h4>
                        <p className="text-xs text-[#a498b2] max-w-md">
                          Browser sandbox finished rendering {run.url}. Full DOM structure and telemetry are captured below.
                        </p>
                      </div>
                    )
                  )}

                  {specimenView === "dom" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#a498b2] pb-1">
                        <span>Captured DOM Payload ({Math.round(htmlContent.length / 1024)} KB)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(htmlContent, "htmlContent")}
                          className="button-secondary text-[10px] py-0.5 px-2"
                        >
                          {copiedKey === "htmlContent" ? "Copied" : "Copy HTML"}
                        </button>
                      </div>
                      <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#c8a96e]/20 bg-[#0e0a16] p-4 font-mono text-[11px] text-[#e8e1d5] leading-relaxed">
                        {htmlContent || "No raw HTML content preserved in observation payload."}
                      </pre>
                    </div>
                  )}

                  {specimenView === "metadata" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
                      <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3.5 space-y-1">
                        <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#dfc28d]">
                          Target Entry URL
                        </span>
                        <p className="font-mono text-xs text-slate-200 break-all">{browserObs.initial_url}</p>
                      </div>
                      <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3.5 space-y-1">
                        <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#dfc28d]">
                          Final Destination URL
                        </span>
                        <p className="font-mono text-xs text-slate-200 break-all">{browserObs.final_url || browserObs.initial_url}</p>
                      </div>
                      <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3.5 space-y-1">
                        <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#dfc28d]">
                          Redirect Chain Hops
                        </span>
                        <p className="font-serif text-lg font-bold text-[#f5ebd9]">
                          {browserObs.redirect_chain?.length || 0} <span className="text-xs text-[#a498b2] font-normal">hops recorded</span>
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3.5 space-y-1">
                        <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#dfc28d]">
                          Sandbox Engine
                        </span>
                        <p className="font-serif text-xs font-semibold text-[#a8e6cf]">
                          Playwright Chromium Headless Sandbox
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Plate Footer */}
              <div className="flex flex-wrap items-center justify-between text-xs text-[#a498b2] border-t border-[#c8a96e]/15 pt-3">
                <span className="flex items-center gap-1.5 font-serif">
                  <Clock size={12} className="text-[#dfc28d]" /> Captured: {dateTime(run.created_at)}
                </span>
                <span className="font-mono text-[11px] text-[#dfc28d]">
                  Resolved Destination: {browserObs.final_url || run.url}
                </span>
              </div>
            </div>
          );
        })() : (
          <div className="py-12 text-center text-xs text-[#a498b2]">
            No rendered visual specimen artifact was generated for this domain investigation.
          </div>
        )}
      </ArchiveFrame>

      {/* =========================================================================
          5. VISUAL OBSERVATION DOSSIER (VLM ANALYSIS)
          ========================================================================= */}
      {vlm && (() => {
        const isPhishing = Boolean(vlmResponse.visual_phishing);
        const isImpersonation = Boolean(vlmResponse.brand_impersonation);
        const hasLoginForm = Boolean(vlmResponse.login_form);
        const isHarvesting = Boolean(vlmResponse.credential_harvesting_indicator);
        const confidence = typeof vlmResponse.confidence === "number" ? Math.round(vlmResponse.confidence * 100) : null;
        const providerName = String(vlmResponse.provider || "ollama");
        const modelName = String(vlmResponse.model || "qwen2.5vl:7b");

        return (
          <ArchiveFrame
            title="Visual Observation Dossier (VLM Analysis)"
            subtitle="Vision-Language Model analysis of visual branding, form fields, and deception tactics."
            referenceId="OBSERVATION // VLM DOSSIER"
          >
            <div className="space-y-5 text-xs">
              {/* Structured VLM Signal Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Visual Phishing */}
                <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                      Visual Phishing
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-serif text-[9px] font-bold uppercase tracking-wider ${
                        isPhishing ? "bg-[#2c1218] text-[#ff8a9a] border border-[#b4384d]/40" : "bg-[#16271e] text-[#a8e6cf] border border-[#558f70]/40"
                      }`}
                    >
                      {isPhishing ? "Phishing Pattern" : "Clean / Negative"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#dfc28d]">
                    {isPhishing ? "Deceptive interface cues detected by visual model." : "No visual deceptive phishing artifacts observed."}
                  </p>
                </div>

                {/* 2. Brand Impersonation */}
                <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                      Brand Impersonation
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-serif text-[9px] font-bold uppercase tracking-wider ${
                        isImpersonation ? "bg-[#2c1218] text-[#ff8a9a] border border-[#b4384d]/40" : "bg-[#16271e] text-[#a8e6cf] border border-[#558f70]/40"
                      }`}
                    >
                      {isImpersonation ? "Brand Spoofed" : "Authentic / None"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#dfc28d]">
                    {isImpersonation ? "Unauthorized corporate brand mimicry discovered." : "No counterfeit trademark or brand mimicry flagged."}
                  </p>
                </div>

                {/* 3. Login Form */}
                <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                      Interactive Form
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-serif text-[9px] font-bold uppercase tracking-wider ${
                        hasLoginForm ? "bg-[#2d2011] text-[#ffd180] border border-[#e2a554]/40" : "bg-[#181123] text-[#a498b2] border border-[#c8a96e]/20"
                      }`}
                    >
                      {hasLoginForm ? "Login Form Detected" : "No Auth Form"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#dfc28d]">
                    {hasLoginForm ? "Active authentication inputs & password fields verified." : "No interactive login form discovered on viewport."}
                  </p>
                </div>

                {/* 4. Credential Harvesting */}
                <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                      Credential Harvesting
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-serif text-[9px] font-bold uppercase tracking-wider ${
                        isHarvesting ? "bg-[#2c1218] text-[#ff8a9a] border border-[#b4384d]/40" : "bg-[#16271e] text-[#a8e6cf] border border-[#558f70]/40"
                      }`}
                    >
                      {isHarvesting ? "Harvesting Flagged" : "Negative / Safe"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#dfc28d]">
                    {isHarvesting ? "Cross-origin harvesting or exfiltration patterns noted." : "No malicious credential harvesting mechanisms detected."}
                  </p>
                </div>

                {/* 5. Model Confidence */}
                <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                      AI Assessment Confidence
                    </span>
                    <span className="font-mono text-xs font-bold text-[#f5ebd9]">
                      {confidence !== null ? `${confidence}%` : "—"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#251b36] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#c8a96e] to-[#dfc28d]"
                      style={{ width: `${confidence ?? 80}%` }}
                    />
                  </div>
                </div>

                {/* 6. Model Specification */}
                <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
                      Model Provenance
                    </span>
                    <span className="rounded bg-[#251b33] px-1.5 py-0.5 font-mono text-[10px] text-[#dfc28d] border border-[#c8a96e]/20">
                      {providerName}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-[#f5ebd9] truncate">
                    {modelName}
                  </p>
                </div>
              </div>

              {/* Collapsible Raw VLM Telemetry Accordion */}
              <div className="pt-2 border-t border-[#c8a96e]/15">
                <button
                  type="button"
                  onClick={() => setShowRawVlm(!showRawVlm)}
                  className="font-serif text-xs font-bold text-[#dfc28d] hover:text-[#f5ebd9] flex items-center gap-1.5"
                >
                  <span>❖</span> {showRawVlm ? "Hide Raw Model Telemetry" : "Inspect Raw Model Observation Record"}
                </button>
                {showRawVlm && (
                  <pre className="mt-3 rounded-lg border border-[#c8a96e]/20 bg-[#0e0a16] p-4 font-mono text-[11px] text-[#e8e1d5] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {JSON.stringify(vlmResponse, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </ArchiveFrame>
        );
      })()}

      {/* =========================================================================
          6. TECHNICAL OBSERVATION TABS (DOM Signals, Scripts & Links, Network)
          ========================================================================= */}
      <ArchiveFrame
        title="Technical Observation Logs"
        subtitle="Structural signals, discovered external links, scripts, and network telemetry."
        referenceId="TELEMETRY // RAW EXPOSURE"
      >
        {(() => {
          const browserObs = run.browser_observation;
          const domSignals = (browserObs?.dom_signals || {}) as Record<string, unknown>;
          const jsSignals = (browserObs?.javascript_signals || {}) as Record<string, unknown>;
          const requests = Array.isArray(browserObs?.requests) ? (browserObs.requests as Record<string, unknown>[]) : [];
          const contactedDomains = Array.isArray(browserObs?.domains) ? (browserObs.domains as string[]) : [];
          const scriptUrls = Array.isArray(jsSignals.external_script_urls) ? (jsSignals.external_script_urls as string[]) : [];

          return (
            <div className="space-y-4">
              {/* Tab Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c8a96e]/15 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("dom")}
                    className={`font-serif text-xs font-bold tracking-wider px-3.5 py-1.5 rounded transition-colors ${
                      activeTab === "dom"
                        ? "bg-[#2b1f3c] text-[#dfc28d] border border-[#c8a96e]/40 shadow-sm"
                        : "text-[#a498b2] hover:text-[#f5ebd9]"
                    }`}
                  >
                    DOM Signals & Links ({contactedDomains.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("js")}
                    className={`font-serif text-xs font-bold tracking-wider px-3.5 py-1.5 rounded transition-colors ${
                      activeTab === "js"
                        ? "bg-[#2b1f3c] text-[#dfc28d] border border-[#c8a96e]/40 shadow-sm"
                        : "text-[#a498b2] hover:text-[#f5ebd9]"
                    }`}
                  >
                    JavaScript Signals & Scripts ({scriptUrls.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("network")}
                    className={`font-serif text-xs font-bold tracking-wider px-3.5 py-1.5 rounded transition-colors ${
                      activeTab === "network"
                        ? "bg-[#2b1f3c] text-[#dfc28d] border border-[#c8a96e]/40 shadow-sm"
                        : "text-[#a498b2] hover:text-[#f5ebd9]"
                    }`}
                  >
                    Network Requests ({requests.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRawLogs(!showRawLogs)}
                  className="font-serif text-[11px] text-[#dfc28d] hover:text-[#f5ebd9] underline"
                >
                  {showRawLogs ? "Hide Raw JSON" : "View Raw JSON"}
                </button>
              </div>

              {/* TAB 1: DOM SIGNALS & CONTACTED LINKS */}
              {activeTab === "dom" && (
                <div className="space-y-4">
                  {/* Metric Plaques */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Password Fields</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(domSignals.password_fields ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Form Elements</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(domSignals.forms ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">External Actions</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(domSignals.external_form_actions ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Iframes</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(domSignals.iframes ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Hidden Elements</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(domSignals.hidden_elements ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">External Links</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#dfc28d]">
                        {String(domSignals.external_links ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Discovered External Links & Contacted Domains List */}
                  <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2">
                      <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#dfc28d] flex items-center gap-1.5">
                        <Globe size={13} className="text-[#dfc28d]" /> Extracted Contacted Domains & Links ({contactedDomains.length})
                      </span>
                    </div>

                    {contactedDomains.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {contactedDomains.map((dom, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded border border-[#c8a96e]/15 bg-[#1b1328] px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[#dfc28d] font-serif text-xs">❖</span>
                              <span className="font-mono text-xs text-slate-200 truncate">{dom}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(dom, `domain-${idx}`)}
                              className="text-[#a498b2] hover:text-[#dfc28d] shrink-0"
                              title="Copy Domain"
                            >
                              {copiedKey === `domain-${idx}` ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#a498b2]">No external domain connections recorded during sandbox crawl.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: JAVASCRIPT SIGNALS & EXTERNAL SCRIPTS */}
              {activeTab === "js" && (
                <div className="space-y-4">
                  {/* Metric Plaques */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Script Count</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(jsSignals.script_count ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Inline Scripts</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#f5ebd9]">
                        {String(jsSignals.inline_script_count ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-3 text-center">
                      <p className="font-serif text-[10px] text-[#a498b2] uppercase">Obfuscation Tokens</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#dfc28d]">
                        {String(jsSignals.obfuscation_tokens ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Discovered External Script URLs List */}
                  <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2">
                      <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#dfc28d] flex items-center gap-1.5">
                        <Code size={13} className="text-[#dfc28d]" /> External Script Sources ({scriptUrls.length})
                      </span>
                    </div>

                    {scriptUrls.length > 0 ? (
                      <div className="space-y-2">
                        {scriptUrls.map((url, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-3 rounded border border-[#c8a96e]/15 bg-[#1b1328] px-3.5 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Code size={12} className="text-[#dfc28d] shrink-0" />
                              <span className="font-mono text-xs text-slate-200 truncate" title={url}>
                                {url}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(url, `script-${idx}`)}
                              className="text-[#a498b2] hover:text-[#dfc28d] shrink-0"
                              title="Copy Script URL"
                            >
                              {copiedKey === `script-${idx}` ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#a498b2]">No external scripts imported by this page.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: NETWORK REQUESTS */}
              {activeTab === "network" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2">
                      <span className="font-serif text-xs font-bold uppercase tracking-wider text-[#dfc28d] flex items-center gap-1.5">
                        <Activity size={13} className="text-[#dfc28d]" /> Captured Network Requests ({requests.length})
                      </span>
                    </div>

                    {requests.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        {requests.map((req, idx) => {
                          const reqUrl = String(req.url || "");
                          const reqStatus = String(req.status || "—");
                          const reqType = String(req.resource_type || "request");

                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 rounded border border-[#c8a96e]/15 bg-[#1b1328] px-3.5 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="rounded bg-[#291c36] px-1.5 py-0.5 font-mono text-[10px] text-[#a8e6cf] border border-[#558f70]/30 shrink-0">
                                  {reqStatus}
                                </span>
                                <span className="rounded bg-[#1a1224] px-1.5 py-0.5 font-mono text-[10px] text-[#dfc28d] shrink-0">
                                  {reqType}
                                </span>
                                <span className="font-mono text-xs text-slate-200 truncate" title={reqUrl}>
                                  {reqUrl}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy(reqUrl, `req-${idx}`)}
                                className="text-[#a498b2] hover:text-[#dfc28d] shrink-0"
                                title="Copy Request URL"
                              >
                                {copiedKey === `req-${idx}` ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-[#a498b2]">No individual network sub-requests logged for this run.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Raw JSON inspection */}
              {showRawLogs && (
                <div className="mt-4 pt-3 border-t border-[#c8a96e]/15">
                  <pre className="max-h-72 overflow-auto rounded-lg border border-[#c8a96e]/20 bg-[#0e0a16] p-4 font-mono text-[11px] text-[#f0e6d6] leading-relaxed whitespace-pre-wrap">
                    {activeTab === "dom" && JSON.stringify(domSignals, null, 2)}
                    {activeTab === "js" && JSON.stringify(jsSignals, null, 2)}
                    {activeTab === "network" && JSON.stringify(requests, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })()}
      </ArchiveFrame>
    </div>
  );
}
