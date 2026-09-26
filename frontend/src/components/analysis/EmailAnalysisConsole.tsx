import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../../api";
import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Hash,
  Mail,
  Refresh,
  Shield,
  Upload,
  X,
} from "../icons";
import { ArchiveFrame } from "../archive/ArchiveFrame";
import { ClassificationSeal } from "../archive/ClassificationSeal";
import { EvidenceExhibitRow } from "../archive/EvidenceExhibitRow";
import { OrnamentalDivider } from "../archive/OrnamentalDivider";
import type { Analysis, EmailInfo } from "../../types";
import { dateTime, percent, riskLevelFromAnalysis, saveInvestigationId } from "../../utils";

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
              err instanceof Error ? err.message : "Analysis record could not be loaded."
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
        setUploadError("Only RFC 822 (.eml) correspondence files are accepted.");
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
        setUploadError("Only RFC 822 (.eml) correspondence files are accepted.");
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
      saveInvestigationId(result.id);
      navigate(`/analyses/${result.id}`);
    } catch (err) {
      setUploadError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Correspondence analysis failed. Please verify the atelier backend connection."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleStartForensics(urlId: string) {
    if (!analysis) return;
    setRunningForensicsUrl(urlId);
    setForensicsStage("Attuning specimen inspection sandbox…");
    setForensicsError(null);

    try {
      setForensicsStage("Collecting DOM, network, and VLM evidence…");
      const run = await api.startForensics(analysis.id, urlId);
      setForensicsStage("Inspection complete");
      saveInvestigationId(run.id);
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

  const calculatedScore = analysis
    ? Math.round((probability(analysis) ?? 0) * 100)
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* =========================================================================
          1. FOLIO HEADER
          ========================================================================= */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#c8a96e]/15 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded border border-[#c8a96e]/30 bg-[#251b33] px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
            <span>❖</span>
            <span>Chapter 02 • Forensic Intake</span>
          </div>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f5ebd9]">
            {analysis ? "Email Case File" : "Deposit Correspondence"}
          </h1>
          <p className="mt-1 text-xs text-[#a498b2] max-w-2xl leading-relaxed">
            {analysis
              ? "Comprehensive RFC 822 forensic dissection, extracted target indicators, and threat assessment."
              : "Deposit an RFC 822 (.eml) correspondence to parse structural provenance, extract embedded indicators, and record forensic evidence."}
          </p>
        </div>

        {analysis && (
          <button
            type="button"
            onClick={handleResetToUpload}
            className="button-secondary text-xs"
          >
            <Upload size={14} className="text-[#c8a96e]" />
            Deposit Another File
          </button>
        )}
      </div>

      {/* =========================================================================
          2. DEPOSIT / UPLOAD FOLIO (When no active analysis)
          ========================================================================= */}
      {!analysis && !loadingDetails && (
        <ArchiveFrame
          title="Correspondence Intake"
          subtitle="Deposit an .eml message for multi-engine RFC 822 parsing and threat evaluation."
          referenceId="INTAKE // PROTOCOL 822"
          elevated
        >
          <div className="max-w-2xl mx-auto space-y-6 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".eml,message/rfc822"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all ${
                  isDragOver
                    ? "border-[#dfc28d] bg-[#251c36] shadow-[0_0_25px_rgba(200,169,110,0.15)]"
                    : "border-[#c8a96e]/25 bg-[#140e1e]/60 hover:border-[#dfc28d]/50 hover:bg-[#1a1226]"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#c8a96e]/40 bg-[#251b36] text-[#dfc28d] shadow-sm">
                  <Mail size={26} />
                </div>
                <h3 className="mt-4 font-serif text-base font-bold text-[#f5ebd9]">
                  Deposit .eml Correspondence Here
                </h3>
                <p className="mt-1 text-xs text-[#a498b2]">
                  or select an artifact from your local files
                </p>
                <button
                  type="button"
                  className="mt-3 button text-xs py-1.5 px-4"
                >
                  Browse Archive Files
                </button>
                <p className="mt-4 text-[10px] text-[#7a6f87] uppercase tracking-wider font-serif">
                  Standard format: RFC 822 message (.eml)
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#c8a96e]/35 bg-[#1b1328] p-5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#c8a96e]/40 bg-[#2b1f3c] text-[#dfc28d]">
                      <FileText size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-sm font-bold text-[#f5ebd9]">
                        {file.name}
                      </p>
                      <p className="text-xs text-[#a498b2]">
                        {formatBytes(file.size)} • RFC 822 Artifact
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setFile(null)}
                      className="button-secondary text-xs"
                    >
                      <X size={13} />
                      Discard
                    </button>

                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => handleAnalyzeSubmit()}
                      className="button text-xs py-2 px-5"
                    >
                      {uploading ? (
                        <>
                          <Refresh size={13} className="animate-spin text-[#dfc28d]" />
                          Examining…
                        </>
                      ) : (
                        <>
                          <Shield size={13} className="text-[#dfc28d]" />
                          Examine Correspondence
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-3 rounded-lg border border-[#b4384d]/40 bg-[#2c1218]/80 p-4 text-xs text-[#ff8a9a]">
                <AlertTriangle size={16} className="text-[#ff8a9a] shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </ArchiveFrame>
      )}

      {/* =========================================================================
          LOADING STATE
          ========================================================================= */}
      {(uploading || loadingDetails) && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-12 text-center shadow-xl">
          <div className="h-12 w-12 rounded-full border-2 border-[#c8a96e]/20 border-t-[#dfc28d] animate-spin" />
          <div className="mt-4 font-serif text-xs font-bold uppercase tracking-widest text-[#dfc28d]">
            Forensic Examination in Progress
          </div>
          <p className="mt-1 font-serif text-sm text-[#f5ebd9]">
            Dissecting envelope headers, extracting target vectors, and computing models…
          </p>
        </div>
      )}

      {/* =========================================================================
          ERROR STATE
          ========================================================================= */}
      {detailsError && !loadingDetails && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#b4384d]/40 bg-[#2c1218]/80 p-10 text-center">
          <AlertTriangle size={28} className="text-[#ff8a9a]" />
          <h3 className="mt-3 font-serif text-base font-bold text-[#f5ebd9]">Examination Failed</h3>
          <p className="mt-1 max-w-md text-xs text-[#a498b2]">{detailsError}</p>
          <button
            type="button"
            onClick={handleResetToUpload}
            className="mt-4 button-secondary text-xs"
          >
            Deposit Another File
          </button>
        </div>
      )}

      {/* =========================================================================
          SUCCESS: THE EMAIL CASE FILE DOCUMENT COMPOSITION
          ========================================================================= */}
      {analysis && email && !loadingDetails && (
        <div className="space-y-6">
          {/* Main Case File Dossier */}
          <div className="relative rounded-xl border border-[#c8a96e]/35 bg-gradient-to-br from-[#1b1328]/95 to-[#130d1d]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.65)]">
            <span className="pointer-events-none absolute top-2 left-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>
            <span className="pointer-events-none absolute top-2 right-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>

            {/* Dossier Header & Classification Seal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#c8a96e]/20">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
                    OFFICIAL CASE FILE
                  </span>
                  <span className="text-[#c8a96e]/40">•</span>
                  <span className="font-mono text-[10px] text-[#a498b2]">
                    REF #{analysis.id.slice(0, 16).toUpperCase()}
                  </span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#f5ebd9] tracking-tight">
                  {analysis.label.replace(/_/g, " ").toUpperCase()}
                </h2>
                <p className="text-xs text-[#a498b2] max-w-xl leading-relaxed">
                  Evaluated with {analysis.model_name}. Final forensic verdict is confirmed upon specimen URL investigation.
                </p>
              </div>

              {/* Concentric Classification Seal */}
              <div className="shrink-0 self-start md:self-center">
                <ClassificationSeal
                  verdict={analysis.label}
                  score={calculatedScore}
                  size="md"
                  subtitle="Initial Threat Assessment"
                />
              </div>
            </div>

            {/* Core Metadata Manifest (SUBJECT, FROM, TARGET) */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1">
                <span className="font-serif text-[10px] font-bold tracking-wider uppercase text-[#c8a96e]">
                  SUBJECT
                </span>
                <p className="font-serif text-sm font-semibold text-[#f5ebd9] break-words">
                  {email.subject || "(no subject recorded)"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-serif text-[10px] font-bold tracking-wider uppercase text-[#c8a96e]">
                  SENDER (FROM)
                </span>
                <p className="font-mono text-xs text-[#dfc28d] break-all">
                  {email.sender || "Unavailable"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-serif text-[10px] font-bold tracking-wider uppercase text-[#c8a96e]">
                  RECIPIENTS (TO)
                </span>
                <p className="text-[#d5cbbd] break-words">
                  {email.recipients && email.recipients.length > 0
                    ? email.recipients.join(", ")
                    : "Unavailable"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-serif text-[10px] font-bold tracking-wider uppercase text-[#c8a96e]">
                  RECORDED DATE
                </span>
                <p className="text-[#d5cbbd]">
                  {email.created_at ? dateTime(email.created_at) : "Unavailable"}
                </p>
              </div>

              {email.sha256 && (
                <div className="md:col-span-2 pt-3 border-t border-[#c8a96e]/15 flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-serif text-[10px] font-bold tracking-wider uppercase text-[#c8a96e]">
                      SHA-256 PROVENANCE HASH
                    </span>
                    <p className="font-mono text-[11px] text-[#f0e6d6] truncate">
                      {email.sha256}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(email.sha256!, "sha256")}
                    className="button-secondary text-xs py-1 px-3 ml-4 shrink-0"
                  >
                    {copiedId === "sha256" ? "Copied" : "Copy Hash"}
                  </button>
                </div>
              )}
            </div>

            {/* Model Metrics Row */}
            <div className="mt-6 pt-5 border-t border-[#c8a96e]/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3">
                <div className="font-serif text-[10px] font-semibold text-[#a498b2] uppercase">
                  Threat Probability
                </div>
                <div className="font-serif text-xl font-bold text-[#f5ebd9] mt-0.5">
                  {percent(probability(analysis))}
                </div>
              </div>

              <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3">
                <div className="font-serif text-[10px] font-semibold text-[#a498b2] uppercase">
                  Confidence
                </div>
                <div className="font-serif text-xl font-bold text-[#f5ebd9] mt-0.5">
                  {percent(analysis.confidence)}
                </div>
              </div>

              <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3">
                <div className="font-serif text-[10px] font-semibold text-[#a498b2] uppercase">
                  Extracted Vectors
                </div>
                <div className="font-serif text-xl font-bold text-[#dfc28d] mt-0.5">
                  {email.urls.length}
                </div>
              </div>

              <div className="rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-3">
                <div className="font-serif text-[10px] font-semibold text-[#a498b2] uppercase">
                  Deep Dossier
                </div>
                <Link
                  to={`/analyses/${analysis.id}`}
                  className="inline-flex items-center gap-1 font-serif text-xs font-bold text-[#dfc28d] hover:text-white mt-1.5 transition-colors"
                >
                  <span>Open Full Record →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* =========================================================================
              EXHIBIT SECTION: COLLECTED INVESTIGATION CLUES
              ========================================================================= */}
          <ArchiveFrame
            title="Collected Evidence Exhibits"
            subtitle="Extracted forensic indicators and target vectors identified in message correspondence."
            referenceId="EXHIBIT LEDGER // SECTION 04"
          >
            {/* Status message during forensic execution */}
            {forensicsStage && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[#c8a96e]/30 bg-[#251b33] p-3 text-xs text-[#dfc28d]">
                <Refresh size={14} className="animate-spin text-[#dfc28d] shrink-0" />
                <span>{forensicsStage}</span>
              </div>
            )}

            {forensicsError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[#b4384d]/40 bg-[#2c1218] p-3 text-xs text-[#ff8a9a]">
                <AlertTriangle size={14} className="text-[#ff8a9a] shrink-0" />
                <span>{forensicsError}</span>
              </div>
            )}

            <div className="space-y-3">
              {email.urls.length > 0 ? (
                email.urls.map((urlItem, index) => {
                  const letter = String.fromCharCode(65 + index); // A, B, C...
                  const isRunning = runningForensicsUrl === urlItem.id;
                  return (
                    <EvidenceExhibitRow
                      key={urlItem.id}
                      exhibitLetter={letter}
                      title={`EXHIBIT ${letter} • TARGET HYPERLINK`}
                      value={urlItem.url}
                      copyable
                      description={`Domain Authority: ${urlItem.domain || "Unknown"}`}
                      action={
                        <button
                          type="button"
                          disabled={Boolean(runningForensicsUrl)}
                          onClick={() => handleStartForensics(urlItem.id)}
                          className="button text-xs py-1.5 px-3 shrink-0"
                        >
                          {isRunning ? (
                            <>
                              <Refresh size={12} className="animate-spin" />
                              Examining…
                            </>
                          ) : (
                            <>
                              <Globe size={12} className="text-[#dfc28d]" />
                              Inspect Dossier
                            </>
                          )}
                        </button>
                      }
                    />
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-[#a498b2]">
                  No external hyperlinks or target vectors were detected in this correspondence.
                </div>
              )}
            </div>

            <OrnamentalDivider label="MESSAGE TRANSCRIPT & HEADERS" className="my-6" />

            {/* Evidence Tabs: Body vs Headers */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#c8a96e]/15 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("body")}
                  className={`font-serif text-xs font-bold tracking-wider px-3 py-1 rounded transition-colors ${
                    activeTab === "body"
                      ? "bg-[#2b1f3c] text-[#dfc28d] border border-[#c8a96e]/40"
                      : "text-[#a498b2] hover:text-[#f5ebd9]"
                  }`}
                >
                  Extracted Body Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("headers")}
                  className={`font-serif text-xs font-bold tracking-wider px-3 py-1 rounded transition-colors ${
                    activeTab === "headers"
                      ? "bg-[#2b1f3c] text-[#dfc28d] border border-[#c8a96e]/40"
                      : "text-[#a498b2] hover:text-[#f5ebd9]"
                  }`}
                >
                  RFC 822 Envelope Headers
                </button>
              </div>

              {activeTab === "body" ? (
                <div className="max-h-72 overflow-auto rounded-lg border border-[#c8a96e]/20 bg-[#120d1a] p-4 text-xs font-serif text-[#d5cbbd] leading-relaxed whitespace-pre-wrap">
                  {email.text_body || "No text body content was extracted from this message."}
                </div>
              ) : (
                <div className="max-h-72 overflow-auto rounded-lg border border-[#c8a96e]/20 bg-[#120d1a] p-4 font-mono text-[11px] text-[#f0e6d6] leading-relaxed whitespace-pre-wrap">
                  {email.headers
                    ? JSON.stringify(email.headers, null, 2)
                    : "No raw header key-value structure available."}
                </div>
              )}
            </div>
          </ArchiveFrame>
        </div>
      )}
    </div>
  );
}
