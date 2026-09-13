import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../api";
import {
  Activity,
  AlertTriangle,
  BarChart,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  Mail,
  Shield,
} from "../icons";
import { RiskIndicator } from "../ui/RiskIndicator";
import { SystemStatus } from "../ui/StatusIndicator";
import { CyberGlobe } from "./CyberGlobe";
import type { Analysis, AnalysisWithEmail, ForensicRun } from "../../types";
import { dateTime, percent } from "../../utils";

const cache = {
  get<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") as T | null;
    } catch {
      return null;
    }
  },
};

function probability(analysis: Analysis) {
  return (
    analysis.phishing_probability ??
    analysis.email_phishing_probability ??
    analysis.url_phishing_probability
  );
}

export function Dashboard() {
  const [health, setHealth] = useState<SystemStatus>("checking");
  const analysis = cache.get<AnalysisWithEmail>("lastAnalysis");
  const run = cache.get<ForensicRun>("lastRun");

  useEffect(() => {
    let isMounted = true;
    api
      .health()
      .then((res) => {
        if (!isMounted) return;
        const s = (res?.status || "").toLowerCase();
        if (s === "degraded") setHealth("degraded");
        else setHealth("online");
      })
      .catch(() => {
        if (!isMounted) return;
        setHealth("offline");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const healthLabels: Record<SystemStatus, string> = {
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
    checking: "Checking…",
  };

  // Compute real counts based ONLY on actual backend data
  const hasAnalysis = Boolean(analysis);
  const totalAnalysesCount = hasAnalysis ? "1" : "—";

  // Threats count: only if real analysis/run has malicious verdict
  const isThreat =
    (run?.verdict &&
      (run.verdict === "MALICIOUS" ||
        run.verdict === "CONFIRMED_MALICIOUS" ||
        run.verdict === "SUSPICIOUS")) ||
    (analysis?.label &&
      analysis.label.toLowerCase().includes("phish"));

  const threatsCount = hasAnalysis ? (isThreat ? "1" : "0") : "—";

  // High risk count: only if real run risk_score >= 70 or critical
  const isHighRisk =
    Boolean(run && run.risk_score >= 70) ||
    (analysis && (probability(analysis) ?? 0) >= 0.7);

  const highRiskCount = hasAnalysis ? (isHighRisk ? "1" : "0") : "—";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* =========================================================================
          1. HERO / WELCOME PANEL (Matching reference design)
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0c162b]/85 via-[#091122]/80 to-[#070c17]/90 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
        {/* Subtle interior ambient light highlights */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 -bottom-20 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-cyan-300 uppercase">
              Security Operations Center
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Threat Intelligence <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400">
                Starts Here
              </span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed">
              Analyze email threats, investigate web content, and uncover
              security intelligence with AI.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NavLink to="/email-analysis" className="button">
                <Mail size={16} />
                Analyze Email
              </NavLink>

              <NavLink to="/forensics" className="button-secondary">
                <Globe size={16} />
                Investigate URL
              </NavLink>
            </div>
          </div>

          {/* Right Column: Atmospheric Cyber Globe & Telemetry Badge */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <CyberGlobe
              status={health}
              statusLabel={healthLabels[health]}
              className="h-72 w-full max-w-[420px]"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. KPI / SUMMARY CARDS (Row of 4 Glass Cards)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Analyses */}
        <div className="group rounded-2xl border border-white/[0.08] bg-[#0c1527]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0e192f]/70">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-transform group-hover:scale-105">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Analyses
            </div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              {totalAnalysesCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              From backend data
            </div>
          </div>
        </div>

        {/* Card 2: Threats Detected */}
        <div className="group rounded-2xl border border-white/[0.08] bg-[#0c1527]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-200 hover:border-rose-500/40 hover:bg-[#0e192f]/70">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-transform group-hover:scale-105">
              <Shield size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Threats Detected
            </div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              {threatsCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Analyzed threats
            </div>
          </div>
        </div>

        {/* Card 3: High Risk */}
        <div className="group rounded-2xl border border-white/[0.08] bg-[#0c1527]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-200 hover:border-amber-500/40 hover:bg-[#0e192f]/70">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-transform group-hover:scale-105">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              High Risk
            </div>
            <div className="mt-1 text-3xl font-extrabold tracking-tight text-white">
              {highRiskCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Requires attention
            </div>
          </div>
        </div>

        {/* Card 4: System Status */}
        <div className="group rounded-2xl border border-white/[0.08] bg-[#0c1527]/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] backdrop-blur-xl transition-all duration-200 hover:border-emerald-500/40 hover:bg-[#0e192f]/70">
          <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-transform group-hover:scale-105">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              System Status
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              <span
                className={`h-3 w-3 rounded-full ${
                  health === "online"
                    ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                    : health === "degraded"
                    ? "bg-amber-400"
                    : health === "offline"
                    ? "bg-rose-500"
                    : "bg-cyan-400 animate-ping"
                }`}
              />
              <span>{healthLabels[health]}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {health === "online"
                ? "API connection active"
                : health === "degraded"
                ? "API partially active"
                : health === "offline"
                ? "API connection failed"
                : "Testing connection…"}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3 & 4. LOWER SECTION: Activity & Recent Investigations
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Investigations Activity */}
        <div className="flex flex-col rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 shadow-[0_12px_36px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Investigations Activity
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time analysis activity from your investigations
                </p>
              </div>
            </div>

            {/* Timeframe selector button */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-cyan-500/30 hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <span>Last 7 days</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>

          {/* Body: Empty State with subtle cyber grid */}
          <div className="flex flex-1 flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border border-white/[0.04] bg-[#091122]/40 mt-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-slate-400 shadow-inner">
              <BarChart size={24} className="text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-200">
              No activity data yet
            </h3>
            <p className="mt-1.5 max-w-sm text-xs text-slate-400">
              Analysis activity will appear here as investigations are performed.
            </p>
          </div>
        </div>

        {/* Right Card: Recent Investigations */}
        <div className="flex flex-col rounded-3xl border border-white/[0.08] bg-[#0c1527]/60 p-6 shadow-[0_12px_36px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Recent Investigations
                </h2>
                <p className="text-xs text-slate-400">
                  Latest email and web investigations
                </p>
              </div>
            </div>
          </div>

          {/* Body: Real Investigation or Empty State */}
          <div className="flex-1 flex flex-col justify-center mt-5">
            {analysis ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a1223]/70 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 uppercase">
                        Email Analysis
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {dateTime(analysis.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-100 truncate">
                      {analysis.email.subject || "(no subject)"}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400 truncate">
                      Sender: {analysis.email.sender || "Unavailable"}
                    </p>
                  </div>

                  {/* Verdict / Label Badge */}
                  <RiskIndicator
                    level={run?.verdict || analysis.label}
                    size="sm"
                  />
                </div>

                {run && (
                  <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[200px] font-mono text-[11px] text-cyan-400">
                      Target: {run.url}
                    </span>
                    <span>Risk Score: {run.risk_score}/100</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <NavLink
                    to={`/analyses/${analysis.id}`}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Open analysis details →
                  </NavLink>
                  {run && (
                    <NavLink
                      to={`/forensics/${run.id}`}
                      className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                    >
                      View forensics →
                    </NavLink>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-14 px-4 text-center rounded-2xl border border-white/[0.04] bg-[#091122]/40">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-slate-400 shadow-inner">
                  <FileText size={24} className="text-slate-400" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-200">
                  No investigations yet
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-slate-400">
                  Start by analyzing an email or URL to see your recent
                  investigations here.
                </p>
                <div className="mt-5">
                  <NavLink to="/email-analysis" className="button text-xs py-2 px-4">
                    <Mail size={14} />
                    Start Analysis
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
