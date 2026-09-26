import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../../api";
import {
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
  Mail,
  Radar,
  Refresh,
  Search,
  Server,
  Shield,
  Terminal,
  X,
  XCircle,
} from "../icons";
import { Badge } from "../ui/Badge";
import { RiskIndicator } from "../ui/RiskIndicator";
import { StatCard } from "../ui/StatCard";
import { ClassificationSeal } from "../archive/ClassificationSeal";
import { ArchiveFrame } from "../archive/ArchiveFrame";
import { OrnamentalDivider } from "../archive/OrnamentalDivider";
import type {
  Analysis,
  EmailInfo,
  ForensicReport,
  ForensicRun,
  InfrastructureObservation,
  ProviderObservation,
} from "../../types";
import {
  dateTime,
  getStoredInvestigationIds,
  percent,
  saveInvestigationId,
  verdictTone,
} from "../../utils";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ReportItem {
  id: string; // runId or analysisId
  runId?: string;
  analysisId?: string;
  emailId?: string;
  url: string;
  domain: string;
  subject: string;
  sender: string;
  recipients: string[];
  verdict: string;
  riskScore: number;
  confidence?: number;
  signalsCount: number;
  signals: string[];
  status: string;
  createdAt: string;
  sha256?: string;
  forensicRun?: ForensicRun;
  analysis?: Analysis;
  email?: EmailInfo;
  reportJson?: Record<string, unknown>;
  reportMarkdown?: string;
}

type VerdictFilter = "ALL" | "SAFE" | "SUSPICIOUS" | "HIGH_RISK" | "MALICIOUS";
type StatusFilter = "ALL" | "COMPLETED" | "PROCESSING" | "FAILED";

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

function extractDomain(url?: string): string {
  if (!url) return "—";
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function truncateString(str: string, maxLen = 45): string {
  if (!str) return "—";
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

function buildReportItem(
  run: ForensicRun,
  analysis?: Analysis | null,
  email?: EmailInfo | null,
  report?: ForensicReport | null
): ReportItem {
  const fused = (run.fused_evidence || {}) as { signals?: string[] };
  const signals = Array.isArray(fused.signals) ? fused.signals : [];

  return {
    id: run.id,
    runId: run.id,
    analysisId: run.analysis_id || analysis?.id,
    emailId: analysis?.email_id || email?.id,
    url: run.url || (analysis as unknown as { email?: { urls?: Array<{ url: string }> } })?.email?.urls?.[0]?.url || "—",
    domain: extractDomain(run.url),
    subject: email?.subject || "—",
    sender: email?.sender || "—",
    recipients: email?.recipients || [],
    verdict: run.verdict || "UNKNOWN",
    riskScore: run.risk_score ?? 0,
    confidence: analysis?.confidence,
    signalsCount: signals.length,
    signals,
    status: run.status || "completed",
    createdAt: run.created_at || new Date().toISOString(),
    sha256: email?.sha256,
    forensicRun: run,
    analysis: analysis || undefined,
    email: email || undefined,
    reportJson: report?.report_json,
    reportMarkdown: report?.report_markdown,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: ReportsPage
   ═══════════════════════════════════════════════════════════════════════════ */

export function ReportsPage() {
  const { reportId } = useParams<{ reportId?: string }>();
  const navigate = useNavigate();

  // Core Data States
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Interaction States
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reportId || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync selectedReportId with route params
  useEffect(() => {
    if (reportId) {
      setSelectedReportId(reportId);
    }
  }, [reportId]);

  /* ── Load Reports from Real Backend & Persistent Ledger ──────────── */
  const loadReportsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const itemsList: ReportItem[] = [];
      const seenRunIds = new Set<string>();

      // 1. Fetch latest real investigation from the backend
      try {
        const latest = await api.latestInvestigation();
        if (latest?.forensic) {
          const run = latest.forensic;
          seenRunIds.add(run.id);
          saveInvestigationId(run.id);

          let repData: ForensicReport | null = null;
          try {
            repData = await api.report(run.id);
          } catch {
            // report is optional / requires enrichment
          }

          itemsList.push(
            buildReportItem(run, latest.analysis, latest.analysis?.email, repData)
          );
        }
      } catch (latestErr) {
        // If latestInvestigation completely fails with network error, note it
        if (!isRefresh && itemsList.length === 0) {
          throw latestErr;
        }
      }

      // 2. Fetch any other historical investigations recorded in localStorage
      const storedIds = getStoredInvestigationIds();
      for (const id of storedIds) {
        if (seenRunIds.has(id)) continue;
        try {
          const run = await api.forensics(id);
          if (run && !seenRunIds.has(run.id)) {
            seenRunIds.add(run.id);
            let repData: ForensicReport | null = null;
            try {
              repData = await api.report(run.id);
            } catch {
              // optional
            }

            let analysisData: Analysis | undefined = undefined;
            let emailData: EmailInfo | undefined = undefined;
            if (run.analysis_id) {
              try {
                analysisData = await api.analysis(run.analysis_id);
                if (analysisData.email_id) {
                  emailData = await api.email(analysisData.email_id);
                }
              } catch {
                // optional
              }
            }

            itemsList.push(buildReportItem(run, analysisData, emailData, repData));
          }
        } catch {
          // Stored run could not be resolved from backend; skip silently
        }
      }

      // Sort by creation time descending (most recent first)
      itemsList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReports(itemsList);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "The reporting data could not be retrieved."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Handle clipboard copy
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  /* ── Filtered Reports ────────────────────────────────────────────── */
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // 1. Text Search across URL, Domain, Subject, IDs, Sender
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          item.id.toLowerCase().includes(query) ||
          (item.analysisId && item.analysisId.toLowerCase().includes(query)) ||
          item.url.toLowerCase().includes(query) ||
          item.domain.toLowerCase().includes(query) ||
          item.subject.toLowerCase().includes(query) ||
          item.sender.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // 2. Verdict Filter
      if (verdictFilter !== "ALL") {
        const tone = verdictTone(item.verdict);
        if (verdictFilter === "SAFE" && tone !== "safe") return false;
        if (verdictFilter === "SUSPICIOUS" && tone !== "suspicious") return false;
        if (verdictFilter === "HIGH_RISK" && (item.riskScore < 70 || item.riskScore >= 90)) return false;
        if (
          verdictFilter === "MALICIOUS" &&
          tone !== "malicious" &&
          item.riskScore < 90
        )
          return false;
      }

      // 3. Status Filter
      if (statusFilter !== "ALL") {
        const st = (item.status || "").toLowerCase();
        if (statusFilter === "COMPLETED" && st !== "completed") return false;
        if (statusFilter === "PROCESSING" && st !== "active" && st !== "processing") return false;
        if (statusFilter === "FAILED" && st !== "failed" && st !== "error") return false;
      }

      return true;
    });
  }, [reports, searchQuery, verdictFilter, statusFilter]);

  /* ── Real Summary Statistics (Zero Fake Data) ─────────────────────── */
  const totalCount = reports.length;
  const threatsCount = reports.filter(
    (r) =>
      r.verdict === "MALICIOUS" ||
      r.verdict === "CONFIRMED_MALICIOUS" ||
      r.verdict === "SUSPICIOUS" ||
      r.riskScore >= 75
  ).length;
  const highRiskCount = reports.filter((r) => r.riskScore >= 70).length;
  const safeCount = reports.filter(
    (r) => r.verdict === "BENIGN" || r.verdict === "SAFE" || r.riskScore < 35
  ).length;

  // Active report for detail drawer/modal view
  const activeReport = useMemo(() => {
    if (!selectedReportId) return null;
    return reports.find((r) => r.id === selectedReportId || r.runId === selectedReportId) || null;
  }, [reports, selectedReportId]);

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER: Loading State (Skeleton Rows)
     ═══════════════════════════════════════════════════════════════════════════ */
  if (loading && !refreshing) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <p className="label">REPORTING</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Threat Reports</h1>
          <p className="mt-2 text-slate-400">
            Forensic evidence summaries generated from fused email, DOM, VLM, and infrastructure intelligence.
          </p>
        </div>

        {/* Skeleton Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-[#0c1527]/40 p-5"
            >
              <div className="h-3 w-1/2 rounded bg-slate-800/60" />
              <div className="mt-4 h-7 w-1/3 rounded bg-slate-700/50" />
            </div>
          ))}
        </div>

        {/* Skeleton Table */}
        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-[#0c1527]/40 p-6">
          <div className="h-4 w-1/4 animate-pulse rounded bg-slate-800/60" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-800/40" />
          <div className="space-y-2 pt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-slate-800/30" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER: Error State
     ═══════════════════════════════════════════════════════════════════════════ */
  if (error && reports.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <p className="label">REPORTING</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Threat Reports</h1>
          <p className="mt-2 text-slate-400">
            Forensic evidence summaries generated from fused email, DOM, VLM, and infrastructure intelligence.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-950/20 p-10 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <AlertTriangle size={28} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-100">Unable to load reports</h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-400">
            The reporting data could not be retrieved from the backend API.
          </p>
          <p className="mt-2 text-xs font-mono text-rose-300/80 bg-rose-950/40 border border-rose-500/20 px-3 py-1 rounded-lg">
            {error}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => loadReportsData()}
              className="button inline-flex items-center gap-2"
            >
              <Refresh size={15} />
              Retry
            </button>
            <Link to="/" className="button-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER: Main Reports Workspace
     ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── 1. Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#c8a96e]/15 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded border border-[#c8a96e]/30 bg-[#251b33] px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
            <span>❖</span>
            <span>Chapter 05 • Case Reports</span>
          </div>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold text-[#f5ebd9]">
            Forensic Intelligence Dossier Archive
          </h1>
          <p className="mt-1 text-xs text-[#a498b2]">
            Permanent ledger of investigated email communications, specimen domains, and synthesized threat verdicts.
          </p>
        </div>

        {/* Actions Header Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadReportsData(true)}
            disabled={refreshing}
            className="button-secondary text-xs"
            title="Re-synchronize case ledger"
          >
            <Refresh size={13} className={refreshing ? "animate-spin text-[#dfc28d]" : ""} />
            {refreshing ? "Synchronizing…" : "Sync Ledger"}
          </button>

          <Link to="/email-analysis" className="button text-xs">
            <Mail size={13} className="text-[#dfc28d]" />
            Open New Case
          </Link>
        </div>
      </div>

      {/* ── 2. Report Summary Statistics (Archival Ledger Plaques) ──────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-4 shadow-md">
          <div className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
            Total Cases
          </div>
          <div className="font-serif text-2xl font-extrabold text-[#f5ebd9] mt-1">
            {totalCount > 0 ? (totalCount < 10 ? `0${totalCount}` : totalCount) : "—"}
          </div>
          <div className="text-[10px] text-[#8d809c] mt-0.5">Archived cases</div>
        </div>

        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-4 shadow-md">
          <div className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
            Threats Discovered
          </div>
          <div className="font-serif text-2xl font-extrabold text-[#ff8a9a] mt-1">
            {totalCount > 0 ? (threatsCount < 10 ? `0${threatsCount}` : threatsCount) : "—"}
          </div>
          <div className="text-[10px] text-[#8d809c] mt-0.5">Malicious / suspicious</div>
        </div>

        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-4 shadow-md">
          <div className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
            High Risk Cases
          </div>
          <div className="font-serif text-2xl font-extrabold text-[#ffd180] mt-1">
            {totalCount > 0 ? (highRiskCount < 10 ? `0${highRiskCount}` : highRiskCount) : "—"}
          </div>
          <div className="text-[10px] text-[#8d809c] mt-0.5">Score ≥ 70</div>
        </div>

        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-4 shadow-md">
          <div className="font-serif text-[10px] font-bold uppercase tracking-wider text-[#a498b2]">
            Benign Artifacts
          </div>
          <div className="font-serif text-2xl font-extrabold text-[#a8e6cf] mt-1">
            {totalCount > 0 ? (safeCount < 10 ? `0${safeCount}` : safeCount) : "—"}
          </div>
          <div className="text-[10px] text-[#8d809c] mt-0.5">Clean / safe</div>
        </div>
      </div>

      {/* ── 3. Search and Filters Bar ──────────────────────────────────── */}
      <div className="panel space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={15} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports, URLs, subjects, or IDs…"
              className="soc-input pl-10 pr-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Verdict Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] uppercase font-serif font-bold text-[#dfc28d]/80 tracking-wider">Verdict:</span>
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                className="rounded-lg border border-[#c8a96e]/30 bg-[#181226] px-3 py-1.5 text-xs text-slate-200 focus:border-[#dfc28d] focus:outline-none"
              >
                <option value="ALL">All Verdicts</option>
                <option value="SAFE">Safe / Benign</option>
                <option value="SUSPICIOUS">Suspicious</option>
                <option value="HIGH_RISK">High Risk</option>
                <option value="MALICIOUS">Malicious / Phishing</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] uppercase font-serif font-bold text-[#dfc28d]/80 tracking-wider">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-[#c8a96e]/30 bg-[#181226] px-3 py-1.5 text-xs text-slate-200 focus:border-[#dfc28d] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {(searchQuery || verdictFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVerdictFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="text-[11px] font-serif font-bold text-[#dfc28d] hover:text-[#f3e5ab] underline tracking-wide ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter results counter */}
        {reports.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-[#c8a96e]/10 pt-3">
            <span>
              Showing {filteredReports.length} of {reports.length} reports in archive
            </span>
            {refreshing && (
              <span className="flex items-center gap-1.5 text-[#dfc28d] text-[11px]">
                <Refresh size={12} className="animate-spin" /> Synchronizing investigations…
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 4. Empty State: No Reports Generated ───────────────────────── */}
      {reports.length === 0 ? (
        <div className="rounded-2xl border border-[#c8a96e]/25 bg-[#120d1c]/80 p-12 text-center backdrop-blur-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c8a96e]/30 bg-[#1e152d] text-[#dfc28d] shadow-[0_0_24px_rgba(200,169,110,0.15)]">
            <FileText size={32} />
          </div>
          <h2 className="mt-4 font-serif text-xl font-bold text-slate-100">No Reports in Ledger</h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-slate-400">
            Archival forensic threat reports will manifest here once an investigation is concluded.
          </p>
          <div className="mt-6">
            <Link to="/email-analysis" className="button">
              <Mail size={16} />
              Analyze an Email
            </Link>
          </div>
        </div>
      ) : filteredReports.length === 0 ? (
        /* No Search Matches */
        <div className="panel p-10 text-center">
          <p className="text-sm font-semibold text-slate-200">No reports match your filters</p>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or verdict filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setVerdictFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="mt-4 button-secondary text-xs"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        /* ── 5. Archival Case Ledger (Table on Desktop, Cards on Mobile) ── */
        <div className="space-y-4">
          {/* Desktop Codex Ledger Table */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 shadow-xl backdrop-blur-xl">
            <table className="w-full text-left text-xs min-w-[1050px]">
              <thead>
                <tr className="border-b border-[#c8a96e]/20 bg-[#140e1e]/90 font-serif text-[11px] font-bold uppercase tracking-wider text-[#dfc28d]">
                  <th className="px-5 py-3.5 w-40">Classification</th>
                  <th className="px-5 py-3.5 min-w-[240px]">Target Specimen</th>
                  <th className="px-5 py-3.5 w-36">Assessment Score</th>
                  <th className="px-5 py-3.5 w-44">Evidence Signals</th>
                  <th className="px-5 py-3.5 w-40">Archived Date</th>
                  <th className="px-5 py-3.5 w-32">Status</th>
                  <th className="px-5 py-3.5 text-right w-52">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c8a96e]/15">
                {filteredReports.map((item) => {
                  const isSelected = selectedReportId === item.id;
                  const isMalicious = item.verdict === "MALICIOUS";
                  const isSuspicious = item.verdict === "SUSPICIOUS";

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-[#20172e] ${
                        isSelected ? "bg-[#281c3a]/70 border-l-2 border-l-[#dfc28d]" : ""
                      }`}
                    >
                      {/* Classification Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-serif text-xs font-bold tracking-wider ${
                            isMalicious
                              ? "border-[#b4384d]/60 bg-[#2c1218] text-[#ff8a9a]"
                              : isSuspicious
                              ? "border-[#e2a554]/60 bg-[#2d2011] text-[#ffd180]"
                              : "border-[#558f70]/60 bg-[#16271e] text-[#a8e6cf]"
                          }`}
                        >
                          <span className="text-[#dfc28d]">❖</span>
                          {item.verdict}
                        </span>
                      </td>

                      {/* Target (URL / Domain / Subject) */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded border border-[#c8a96e]/30 bg-[#251b33] px-2 py-0.5 font-mono text-[10px] text-[#dfc28d]">
                              {item.domain}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.url, `url-${item.id}`)}
                              className="text-[#a498b2] hover:text-[#dfc28d]"
                              title="Copy Target URL"
                            >
                              {copiedKey === `url-${item.id}` ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          <p
                            className="font-mono text-xs text-slate-200 truncate"
                            title={item.url}
                          >
                            {item.url}
                          </p>
                          {item.subject && item.subject !== "—" && (
                            <p className="text-[11px] text-slate-400 truncate" title={item.subject}>
                              ✉ {item.subject}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-slate-100">
                              {item.riskScore}
                            </span>
                            <span className="text-[10px] text-[#8d809c]">/ 100</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="h-1.5 w-24 rounded-full bg-[#251c36] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.riskScore >= 70
                                  ? "bg-[#b4384d]"
                                  : item.riskScore >= 35
                                  ? "bg-[#e2a554]"
                                  : "bg-[#558f70]"
                              }`}
                              style={{ width: `${Math.min(100, item.riskScore)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Indicators */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-[#c8a96e]/20 bg-[#1e152d]/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                            <Radar size={12} className="text-[#dfc28d]" />
                            {item.signalsCount} {item.signalsCount === 1 ? "Signal" : "Signals"}
                          </span>
                          {item.signals.length > 0 && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[190px]" title={item.signals.map(s => s.replace(/_/g, " ")).join(", ")}>
                              {item.signals.slice(0, 2).map((s) => s.replace(/_/g, " ")).join(", ")}
                              {item.signals.length > 2 ? ` +${item.signals.length - 2}` : ""}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-slate-300 text-xs font-mono">{dateTime(item.createdAt)}</div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-serif font-bold uppercase tracking-wider text-emerald-400">
                          <CheckCircle size={12} />
                          {item.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReportId(item.id)}
                            className="button text-xs py-1.5 px-3"
                          >
                            Inspect Dossier
                          </button>

                          {item.runId && (
                            <Link
                              to={`/forensics/${item.runId}`}
                              className="button-secondary p-1.5 shrink-0"
                              title="Inspect Specimen"
                            >
                              <Terminal size={13} className="text-[#dfc28d]" />
                            </Link>
                          )}

                          {item.runId && (
                            <Link
                              to={`/infrastructure/${item.runId}`}
                              className="button-secondary p-1.5 shrink-0"
                              title="Threat Atlas"
                            >
                              <Globe size={13} className="text-[#c8a96e]" />
                            </Link>
                          )}

                          {item.analysisId && (
                            <Link
                              to={`/analyses/${item.analysisId}`}
                              className="rounded-lg border border-[#c8a96e]/20 bg-[#1e152d]/60 p-1.5 text-slate-400 hover:text-[#dfc28d] hover:border-[#c8a96e]/50 shrink-0"
                              title="Email Investigation"
                            >
                              <Mail size={13} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Stacked Cards */}
          <div className="lg:hidden space-y-4">
            {filteredReports.map((item) => (
              <div
                key={item.id}
                className="relative rounded-2xl border border-[#c8a96e]/25 bg-[#120d1c]/90 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-md space-y-4 transition hover:border-[#c8a96e]/50"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[#c8a96e]/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#dfc28d]/70 uppercase">Dossier</span>
                    <span className="font-mono text-xs text-[#c8a96e] font-semibold">{item.id.slice(0, 8)}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{dateTime(item.createdAt)}</span>
                </div>

                <div className="flex items-start gap-4">
                  <ClassificationSeal
                    verdict={item.verdict}
                    score={item.riskScore}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-[#c8a96e]/30 bg-[#1e152d] px-2 py-0.5 font-mono text-[11px] text-[#dfc28d]">
                        {item.domain}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-xs text-slate-200 truncate">{item.url}</p>
                    {item.subject && item.subject !== "—" && (
                      <p className="mt-1 text-xs text-slate-400 truncate">✉ {item.subject}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#c8a96e]/10 pt-3 text-xs">
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Risk Score:</span>{" "}
                    <span className="font-bold font-serif text-slate-100">{item.riskScore}/100</span>
                  </div>
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Signals:</span>{" "}
                    <span className="font-semibold font-mono text-[#dfc28d]">{item.signalsCount}</span>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase text-emerald-400">
                      <CheckCircle size={11} /> {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#c8a96e]/10">
                  <button
                    type="button"
                    onClick={() => setSelectedReportId(item.id)}
                    className="button text-xs py-1.5 flex-1"
                  >
                    Inspect Dossier
                  </button>
                  {item.runId && (
                    <Link
                      to={`/forensics/${item.runId}`}
                      className="button-secondary text-xs py-1.5 px-3"
                    >
                      Forensics
                    </Link>
                  )}
                  {item.runId && (
                    <Link
                      to={`/infrastructure/${item.runId}`}
                      className="button-secondary text-xs py-1.5 px-3"
                    >
                      Threat Atlas
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Report Details Modal / Drawer ───────────────────────────── */}
      {activeReport && (
        <ReportDetailModal
          report={activeReport}
          onClose={() => {
            setSelectedReportId(null);
            if (reportId) {
              navigate("/reports", { replace: true });
            }
          }}
          onCopy={handleCopy}
          copiedKey={copiedKey}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENT: ReportDetailModal
   ═══════════════════════════════════════════════════════════════════════════ */

interface ReportDetailModalProps {
  report: ReportItem;
  onClose: () => void;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
}

function ReportDetailModal({ report, onClose, onCopy, copiedKey }: ReportDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "markdown" | "fusion">("summary");
  const run = report.forensicRun;
  const analysis = report.analysis;
  const email = report.email;
  const browser = run?.browser_observation;
  const providers = (run?.provider_observations || []) as ProviderObservation[];

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-[#c8a96e]/35 bg-[#120d1c]/95 shadow-[0_24px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#c8a96e]/20 px-6 py-4 bg-[#181126]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#c8a96e]/30 bg-[#1e152d] text-[#dfc28d] shadow-[0_0_15px_rgba(200,169,110,0.15)]">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base font-bold text-[#dfc28d] tracking-wide">Archival Threat Dossier</h2>
                <Badge value={report.verdict} dot />
              </div>
              <p className="font-mono text-xs text-slate-300 mt-0.5 truncate max-w-md sm:max-w-xl">
                {report.url}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-[#c8a96e]/15 hover:text-[#dfc28d] transition"
            title="Close Report (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#c8a96e]/20 px-6 py-2.5 bg-[#0e0a16] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "summary"
                ? "bg-[#241738] text-[#dfc28d] border border-[#c8a96e]/40 shadow-[0_0_12px_rgba(200,169,110,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1c132c]/50 border border-transparent"
            }`}
          >
            Folio 01: Evidence Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("markdown")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "markdown"
                ? "bg-[#241738] text-[#dfc28d] border border-[#c8a96e]/40 shadow-[0_0_12px_rgba(200,169,110,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1c132c]/50 border border-transparent"
            }`}
          >
            Folio 02: Full Dossier (Markdown)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fusion")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "fusion"
                ? "bg-[#241738] text-[#dfc28d] border border-[#c8a96e]/40 shadow-[0_0_12px_rgba(200,169,110,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1c132c]/50 border border-transparent"
            }`}
          >
            Folio 03: Signals & Telemetry
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* TAB 1: EVIDENCE SUMMARY */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* SECTION: REPORT SUMMARY */}
              <div className="space-y-3">
                <h3 className="font-serif text-xs font-bold uppercase tracking-widest text-[#dfc28d] flex items-center gap-1.5">
                  <span className="text-[#c8a96e]">❖</span> 1. Dossier Ledger & Verdict
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <div className="rounded-xl border border-[#c8a96e]/20 bg-[#181226]/80 p-3.5 flex items-center justify-center">
                    <ClassificationSeal
                      verdict={report.verdict}
                      score={report.riskScore}
                      size="md"
                    />
                  </div>
                  <div className="rounded-xl border border-[#c8a96e]/20 bg-[#181226]/80 p-3.5">
                    <p className="text-[11px] text-[#dfc28d]/70 uppercase tracking-wider">Risk Score</p>
                    <p className="mt-1 font-serif text-xl font-bold text-slate-100">
                      {report.riskScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#c8a96e]/20 bg-[#181226]/80 p-3.5">
                    <p className="text-[11px] text-[#dfc28d]/70 uppercase tracking-wider">Investigation Status</p>
                    <p className="mt-1 font-semibold text-emerald-400 uppercase">
                      {report.status}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#c8a96e]/20 bg-[#181226]/80 p-3.5">
                    <p className="text-[11px] text-[#dfc28d]/70 uppercase tracking-wider">Entry Inscribed</p>
                    <p className="mt-1 font-mono text-slate-200 truncate">{dateTime(report.createdAt)}</p>
                  </div>
                </div>

                {/* ID References */}
                <div className="rounded-xl border border-[#c8a96e]/20 bg-[#181226]/60 p-3.5 space-y-2 text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Archival Run ID:</span>
                    <span className="font-mono text-[#dfc28d]">{report.id}</span>
                  </div>
                  {report.analysisId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Email Case Reference:</span>
                      <span className="font-mono text-slate-300">{report.analysisId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION: EMAIL INTELLIGENCE (If real data exists) */}
              {(email || analysis) && (
                <div className="space-y-3 border-t border-[#c8a96e]/15 pt-5">
                  <h3 className="font-serif text-xs font-bold uppercase tracking-widest text-[#dfc28d] flex items-center gap-1.5">
                    <span className="text-[#c8a96e]">❖</span> 2. Email Provenance Intelligence
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#c8a96e]/20 bg-[#181226]/70 p-4">
                    <div>
                      <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">From (Sender):</span>
                      <p className="font-mono text-slate-200 mt-0.5">{email?.sender || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">To (Recipients):</span>
                      <p className="font-mono text-slate-200 mt-0.5">
                        {email?.recipients?.length ? email.recipients.join(", ") : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Subject:</span>
                      <p className="text-slate-200 mt-0.5 font-medium">{email?.subject || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Email SHA-256 Digest:</span>
                      <p className="font-mono text-[11px] text-slate-300 truncate mt-0.5">
                        {email?.sha256 || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: URL & WEB FORENSICS */}
              <div className="space-y-3 border-t border-[#c8a96e]/15 pt-5">
                <h3 className="font-serif text-xs font-bold uppercase tracking-widest text-[#dfc28d] flex items-center gap-1.5">
                  <span className="text-[#c8a96e]">❖</span> 3. Web Specimen Forensics & VLM Evaluation
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#c8a96e]/20 bg-[#181226]/70 p-4">
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Investigated Specimen URL:</span>
                    <p className="font-mono text-slate-200 break-all mt-0.5">{report.url}</p>
                  </div>
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Target Domain Dossier:</span>
                    <p className="font-mono text-[#dfc28d] mt-0.5">{report.domain}</p>
                  </div>
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Final Landing Destination:</span>
                    <p className="font-mono text-slate-200 break-all mt-0.5">
                      {browser?.final_url || report.url}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Redirect Hops En Route:</span>
                    <p className="text-slate-200 mt-0.5 font-mono">
                      {browser?.redirect_chain?.length ? `${browser.redirect_chain.length} hops` : "0"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Specimen Artifact Captured:</span>
                    <p className="text-slate-200 mt-0.5">
                      {browser?.screenshot_available ? "Yes (Stored in sandbox specimen chamber)" : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#dfc28d]/70 text-[11px] uppercase tracking-wider">Contacted Outer Domains:</span>
                    <p className="text-slate-200 mt-0.5 font-mono">
                      {browser?.domains?.length ? `${browser.domains.length} domains` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: PROVIDER OBSERVATIONS */}
              {providers.length > 0 && (
                <div className="space-y-3 border-t border-[#c8a96e]/15 pt-5">
                  <h3 className="font-serif text-xs font-bold uppercase tracking-widest text-[#dfc28d] flex items-center gap-1.5">
                    <span className="text-[#c8a96e]">❖</span> 4. External Intelligence Feeds & VLM Signals
                  </h3>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {providers.map((p, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#c8a96e]/20 bg-[#181226]/70 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold uppercase text-slate-200">{p.provider}</span>
                          <span className="rounded px-2 py-0.5 text-[10px] uppercase font-mono bg-[#241738] text-[#dfc28d] border border-[#c8a96e]/20">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FULL MARKDOWN REPORT */}
          {activeTab === "markdown" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xs font-bold text-[#dfc28d] tracking-wide">
                  Official Archival Forensic Manuscript
                </span>
                {report.reportMarkdown && (
                  <button
                    type="button"
                    onClick={() => onCopy(report.reportMarkdown || "", "md-copy")}
                    className="button-secondary text-xs py-1 px-3"
                  >
                    {copiedKey === "md-copy" ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check size={12} /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy size={12} /> Copy Manuscript
                      </span>
                    )}
                  </button>
                )}
              </div>
              <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-[#c8a96e]/25 bg-[#0a0711] p-6 font-mono text-xs text-slate-200 leading-relaxed shadow-inner">
                {report.reportMarkdown ||
                  "The formatted report manuscript is not currently generated for this forensic run. Run Phase 3 infrastructure enrichment to generate the official report."}
              </pre>
            </div>
          )}

          {/* TAB 3: SIGNALS & FUSION */}
          {activeTab === "fusion" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#dfc28d]">Fused Threat Signals</h4>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {report.signals.length ? (
                    report.signals.map((sig, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-[#c8a96e]/30 bg-[#1e152d] px-3 py-1 text-xs font-mono text-[#dfc28d]"
                      >
                        {sig}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-400">No active threat signals triggered.</p>
                  )}
                </div>
              </div>

              {report.reportJson && (
                <div className="pt-3 border-t border-[#c8a96e]/15">
                  <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#dfc28d]">
                    Raw Telemetry & Signals JSON
                  </h4>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-xl border border-[#c8a96e]/20 bg-[#0a0711] p-4 font-mono text-[11px] text-slate-300">
                    {JSON.stringify(report.reportJson, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#c8a96e]/20 px-6 py-4 bg-[#140e21]">
          <div className="flex flex-wrap items-center gap-2">
            {report.runId && (
              <Link
                to={`/forensics/${report.runId}`}
                className="button-secondary text-xs"
              >
                <Terminal size={14} />
                Web Forensics
              </Link>
            )}
            {report.runId && (
              <Link
                to={`/infrastructure/${report.runId}`}
                className="button-secondary text-xs"
              >
                <Globe size={14} />
                Threat Atlas
              </Link>
            )}
            {report.analysisId && (
              <Link
                to={`/analyses/${report.analysisId}`}
                className="button-secondary text-xs"
              >
                <Mail size={14} />
                Email Investigation
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="button text-xs py-2 px-5"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
