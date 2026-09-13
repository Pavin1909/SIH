import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../../api";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  FileText,
  Globe,
  Hash,
  Mail,
  Refresh,
  Shield,
  Upload,
  X,
} from "../icons";
import { RiskIndicator } from "../ui/RiskIndicator";
import type { Analysis, EmailInfo } from "../../types";
import { dateTime, percent, riskLevelFromAnalysis } from "../../utils";

function probability(analysis: Analysis) {
  return (
    analysis.phishing_probability ??
    analysis.email_phishing_probability ??
    analysis.url_phishing_probability
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function EmailAnalysisConsole() {
  const { analysisId } = useParams<{ analysisId?: string }>();
  const navigate = useNavigate();

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Analysis / Details State
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [email, setEmail] = useState<EmailInfo | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(Boolean(analysisId));
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Forensic Inspection Action State
  const [runningForensicsUrl, setRunningForensicsUrl] = useState<string | null>(null);
  const [forensicsStage, setForensicsStage] = useState<string>("");
  const [forensicsError, setForensicsError] = useState<string | null>(null);

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active Tab for Evidence (Body vs Headers)
  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");

  // Route state is authoritative. The upload route must never resurrect an
  // older analysis from localStorage after navigating away and back.
  useEffect(() => {
    let active = true;

    if (analysisId) {
      setAnalysis(null);
      setEmail(null);
      setLoadingDetails(true);
      setDetailsError(null);
      (async () => {
        try {
          const detail = await api.analysis(analysisId);
          const message = await api.email(detail.email_id);

          if (active) {
            setAnalysis(detail);
            setEmail(message);
          }
        } catch (err) {
          if (active) {
            setDetailsError(
              err instanceof Error ? err.message : "Analysis could not be loaded."
            );
          }
        } finally {
          if (active) setLoadingDetails(false);
        }
      })();
    } else {
      setAnalysis(null);
      setEmail(null);
      setDetailsError(null);
      setLoadingDetails(false);
    }

    return () => {
      active = false;
    };
  }, [analysisId]);

  // Drag & drop handlers
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (uploading) return;
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const dropped = e.dataTransfer.files?.[0] || null;
    if (dropped) {
      if (!dropped.name.toLowerCase().endsWith(".eml")) {
        setUploadError("Only RFC 822 (.eml) files are accepted.");
        return;
      }
      setFile(dropped);
      setUploadError(null);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".eml")) {
        setUploadError("Only RFC 822 (.eml) files are accepted.");
        return;
      }
      setFile(selected);
      setUploadError(null);
    }
  }

  async function handleAnalyzeSubmit(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!file || uploading) return;

    setUploading(true);
    setUploadError(null);

    try {
      const result = await api.analyzeEmail(file);
      setAnalysis(result);
      setEmail(result.email);
      setFile(null);
      // Navigate to /analyses/:id to persist URL state and route
      navigate(`/analyses/${result.id}`);
    } catch (err) {
      setUploadError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Email analysis failed. Please check the backend connection."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleStartForensics(urlId: string) {
    if (!analysis) return;
    setRunningForensicsUrl(urlId);
    setForensicsStage("Starting isolated browser investigation…");
    setForensicsError(null);

    try {
      setForensicsStage("Collecting DOM, network, and VLM evidence…");
      const run = await api.startForensics(analysis.id, urlId);
      setForensicsStage("Web forensics complete");
      navigate(`/forensics/${run.id}`);
    } catch (err) {
      setForensicsStage("");
      setForensicsError(
        err instanceof Error
          ? err.message
          : "Web forensics failed. Check the sandbox status."
      );
    } finally {
      setRunningForensicsUrl(null);
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleResetToUpload() {
    setAnalysis(null);
    setEmail(null);
    setFile(null);
    setUploadError(null);
    navigate("/email-analysis");
  }

  const riskLevel = analysis
    ? riskLevelFromAnalysis(analysis.label, probability(analysis))
    : "UNKNOWN";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* =========================================================================
          1. PAGE HEADER
          ========================================================================= */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-cyan-300 uppercase">
            Email Threat Analysis
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {analysis ? "Investigation Console" : "Analyze an Email"}
          </h1>
          <p className="mt-1 text-sm text-slate-300 max-w-2xl">
            {analysis
              ? "Comprehensive multi-engine RFC 822 analysis, extracted indicators, and forensic handoff."
              : "Upload an .eml file to analyze message content, extract indicators, and identify potential threats."}
          </p>
        </div>

        {analysis && (
          <button
            type="button"
            onClick={handleResetToUpload}
            className="button-secondary text-xs"
          >
            <Upload size={14} />
            Analyze Another Email
          </button>
        )}
      </div>

      {/* =========================================================================
          2. UPLOAD & SUBMIT PANEL (Shown when no active analysis or when resetting)
          ========================================================================= */}
      {!analysis && !loadingDetails && (
        <div className="rounded-3xl border border-white/[0.08] bg-[#0c162b]/80 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-100">Upload Email</h2>
              <p className="mt-1 text-xs text-slate-400">
                Upload an .eml file for security analysis. The backend parses RFC 822
                headers, extracts URLs, and computes ML threat probabilities.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".eml,message/rfc822"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Drag and Drop Zone / File Selected State */}
            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragOver
                    ? "border-cyan-400 bg-cyan-500/10 text-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.2)]"
                    : "border-white/[0.12] bg-[#0a1223]/60 hover:border-cyan-500/40 hover:bg-[#0c1527]/80"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                  <Mail size={32} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-200">
                  Drop .eml file here
                </h3>
                <p className="mt-1 text-xs text-slate-400">or</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:bg-cyan-500/25 transition-all"
                >
                  Browse Files
                </button>
                <p className="mt-3 text-[11px] text-slate-500">
                  Supported format: RFC 822 message (.eml)
                </p>
              </div>
            ) : (
              /* Selected File State */
              <div className="rounded-2xl border border-cyan-500/30 bg-[#0a1426]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <FileText size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatBytes(file.size)} • RFC 822 message
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setFile(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-rose-500/15 hover:border-rose-500/30 hover:text-rose-200 transition-all"
                    >
                      <X size={14} />
                      Remove
                    </button>

                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => handleAnalyzeSubmit()}
                      className="button text-xs py-2 px-5"
                    >
                      {uploading ? (
                        <>
                          <Refresh size={14} className="animate-spin" />
                          Analyzing…
                        </>
                      ) : (
                        <>
                          <Shield size={14} />
                          Analyze Email
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LOADING STATE: Analysis in Progress
          ========================================================================= */}
      {(uploading || loadingDetails) && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-cyan-500/20 bg-[#0c162b]/80 p-12 text-center backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="absolute flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
              <Shield size={20} />
            </div>
          </div>
          <div className="mt-5 text-xs font-bold uppercase tracking-widest text-cyan-400">
            Analysis in Progress
          </div>
          <p className="mt-1 text-sm font-medium text-slate-200">
            Processing security evidence…
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Parsing message structure, extracting embedded indicators, and evaluating threat models.
          </p>
        </div>
      )}

      {/* =========================================================================
          DETAILS ERROR STATE
          ========================================================================= */}
      {detailsError && !loadingDetails && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-rose-500/30 bg-rose-950/20 p-10 text-center backdrop-blur-2xl">
          <AlertTriangle size={32} className="text-rose-400" />
          <h3 className="mt-3 text-base font-bold text-rose-300">Analysis Failed</h3>
          <p className="mt-1 max-w-md text-xs text-slate-300">{detailsError}</p>
          <button
            type="button"
            onClick={handleResetToUpload}
            className="mt-4 button-secondary text-xs"
          >
            Upload Another File
          </button>
        </div>
      )}

      {/* =========================================================================
          SUCCESS STATE: FULL SOC INVESTIGATION CONSOLE
          ========================================================================= */}
      {analysis && email && !loadingDetails && (
        <div className="space-y-6">
          {/* Result Header & Primary Verdict */}
          <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c162b]/85 via-[#091122]/80 to-[#070c17]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Email Model Classification
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white">
                    {analysis.label.replace(/_/g, " ")}
                  </h2>
                  <RiskIndicator level={riskLevel} size="md" />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Model signal only â€” final verdict is determined after webpage forensics.
                  <span className="block mt-1 text-slate-500">Evaluated with {analysis.model_name}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-slate-300">
                  ID: {analysis.id.slice(0, 12)}…
                </span>
                <Link
                  to={`/analyses/${analysis.id}`}
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-all"
                >
                  <span>View Full Report</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0a1223]/70 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Phishing Probability
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {percent(probability(analysis))}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {analysis.phishing_probability === null
                    ? "URL phishing model"
                    : "Email threat model"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a1223]/70 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Model Confidence
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {percent(analysis.confidence)}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Classification certainty
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a1223]/70 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Extracted URLs
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {email.urls.length}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Embedded links detected
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0a1223]/70 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Created At
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-200">
                  {dateTime(analysis.created_at)}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  Investigation timestamp
                </div>
              </div>
            </div>

            {/* Class Probabilities breakdown if available */}
            {analysis.class_probabilities &&
              Object.keys(analysis.class_probabilities).length > 0 && (
                <div className="mt-5 rounded-2xl border border-white/[0.06] bg-[#080e1c]/60 p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Class Probability Distribution
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(analysis.class_probabilities).map(([cls, prob]) => (
                      <div key={cls} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-slate-300">{cls}</span>
                          <span className="font-mono text-cyan-300">
                            {Math.round(prob * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${Math.round(prob * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </section>

          {/* Email Overview & Metadata Panel */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Email Message Metadata
                </h3>
                <p className="text-xs text-slate-400">
                  Parsed RFC 822 envelope and message headers
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Subject
                </span>
                <p className="font-medium text-slate-100 text-sm break-words">
                  {email.subject || "(no subject)"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Sender (From)
                </span>
                <p className="font-mono text-cyan-300 break-all">
                  {email.sender || "Unavailable"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Recipients (To)
                </span>
                <p className="text-slate-300 break-words">
                  {email.recipients && email.recipients.length > 0
                    ? email.recipients.join(", ")
                    : "Unavailable"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Message Date
                </span>
                <p className="text-slate-300">
                  {email.created_at ? dateTime(email.created_at) : "Unavailable"}
                </p>
              </div>

              {email.sha256 && (
                <div className="md:col-span-2 space-y-1 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      SHA-256 Hash
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(email.sha256!, "sha256")}
                      className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                    >
                      {copiedId === "sha256" ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Hash</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-slate-400 break-all bg-[#080d19]/80 p-2 rounded-lg border border-white/[0.04]">
                    {email.sha256}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Extracted Indicators & Forensics Handoff */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Extracted Indicators & Forensics Handoff
                  </h3>
                  <p className="text-xs text-slate-400">
                    Extracted URLs ready for isolated browser execution and VLM forensics
                  </p>
                </div>
              </div>
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs font-mono text-cyan-300">
                {email.urls.length} Detected
              </span>
            </div>

            {/* Forensics Stage Progress Indicator */}
            {forensicsStage && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-xs text-cyan-200 animate-pulse">
                <Refresh size={16} className="animate-spin text-cyan-400 shrink-0" />
                <span>{forensicsStage}</span>
              </div>
            )}

            {/* Forensics Error */}
            {forensicsError && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
                <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                <span>{forensicsError}</span>
              </div>
            )}

            <div className="mt-4 divide-y divide-white/[0.04]">
              {email.urls.length > 0 ? (
                email.urls.map((urlItem) => (
                  <div
                    key={urlItem.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-white/[0.04]">
                          {urlItem.domain}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(urlItem.url, urlItem.id)}
                          title="Copy URL"
                          className="text-slate-500 hover:text-cyan-300"
                        >
                          {copiedId === urlItem.id ? (
                            <Check size={12} className="text-emerald-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      <p
                        className="mt-1 font-mono text-xs text-cyan-300 truncate"
                        title={urlItem.url}
                      >
                        {urlItem.url}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={runningForensicsUrl !== null}
                      onClick={() => handleStartForensics(urlItem.id)}
                      className="button-secondary text-xs shrink-0 py-1.5 px-3"
                    >
                      {runningForensicsUrl === urlItem.id ? (
                        <>
                          <Refresh size={12} className="animate-spin" />
                          Investigating…
                        </>
                      ) : (
                        <>
                          <Globe size={12} />
                          Run Forensics
                        </>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No URLs were extracted from this message.
                </div>
              )}
            </div>
          </section>

          {/* Email Content / Safe Evidence Viewer (STRICT SECURITY: NO HTML EXECUTION) */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-semibold text-slate-100">
                  Message Content Evidence
                </h3>
                <p className="text-xs text-slate-400">
                  Untrusted email content rendered safely as plain text
                </p>
              </div>

              {/* View switcher tabs */}
              <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#080d19]/80 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("body")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    activeTab === "body"
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
                      activeTab === "headers"
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
              {activeTab === "body" ? (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed selection:bg-cyan-500/20">
                    {email.text_body || "No plaintext body provided in message."}
                  </pre>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-[#080d19]/80 p-4">
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400 leading-relaxed">
                    {JSON.stringify(email.headers || {}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
