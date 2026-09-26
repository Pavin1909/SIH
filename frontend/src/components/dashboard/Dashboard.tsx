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
import { ClassificationSeal } from "../archive/ClassificationSeal";
import { SystemStatus } from "../ui/StatusIndicator";
import { CyberGlobe } from "./CyberGlobe";
import type { Analysis, AnalysisWithEmail, ForensicRun } from "../../types";
import { dateTime } from "../../utils";

function probability(analysis: Analysis) {
  return (
    analysis.phishing_probability ??
    analysis.email_phishing_probability ??
    analysis.url_phishing_probability
  );
}

export function Dashboard() {
  const [health, setHealth] = useState<SystemStatus>("checking");
  const [analysis, setAnalysis] = useState<AnalysisWithEmail | null>(null);
  const [run, setRun] = useState<ForensicRun | null>(null);

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

    api
      .latestInvestigation()
      .then((latest) => {
        if (!isMounted) return;
        setAnalysis(latest.analysis);
        setRun(latest.forensic);
      })
      .catch(() => {
        if (!isMounted) return;
        setAnalysis(null);
        setRun(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const healthLabels: Record<SystemStatus, string> = {
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
    checking: "Attuning…",
  };

  const hasAnalysis = Boolean(analysis);
  const totalAnalysesCount = hasAnalysis ? "01" : "—";

  const isThreat =
    (run?.verdict &&
      (run.verdict === "MALICIOUS" ||
        run.verdict === "CONFIRMED_MALICIOUS" ||
        run.verdict === "SUSPICIOUS")) ||
    (analysis?.label && analysis.label.toLowerCase().includes("phish"));

  const threatsCount = hasAnalysis ? (isThreat ? "01" : "00") : "—";

  const isHighRisk =
    Boolean(run && run.risk_score >= 70) ||
    (analysis && (probability(analysis) ?? 0) >= 0.7);

  const highRiskCount = hasAnalysis ? (isHighRisk ? "01" : "00") : "—";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* =========================================================================
          1. EDITORIAL HERO: THE INVESTIGATOR'S HALL
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-xl border border-[#c8a96e]/30 bg-gradient-to-br from-[#191225]/90 via-[#150f1f]/85 to-[#0f0b17]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_16px_45px_rgba(0,0,0,0.65)]">
        {/* Subtle corner flourishes */}
        <span className="pointer-events-none absolute top-2 left-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>
        <span className="pointer-events-none absolute top-2 right-2.5 font-serif text-[10px] text-[#c8a96e]/60 select-none">❖</span>
        <span className="pointer-events-none absolute bottom-2 left-2.5 font-serif text-[10px] text-[#c8a96e]/40 select-none">❖</span>
        <span className="pointer-events-none absolute bottom-2 right-2.5 font-serif text-[10px] text-[#c8a96e]/40 select-none">❖</span>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
          {/* Left Column: Heading & Archival CTAs */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded border border-[#c8a96e]/35 bg-[#251b33]/60 px-3 py-1 font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
              <span>❖</span>
              <span>Investigation Atelier • Master Codex</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#f5ebd9] leading-tight">
              The Intelligence <br />
              <span className="text-[#dfc28d] font-normal italic font-serif">
                Archive
              </span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-[#d5cbbd] leading-relaxed">
              Investigate suspicious communications, uncover hidden evidence,
              and understand the threats behind every signal.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NavLink to="/email-analysis" className="button">
                <Mail size={15} className="text-[#dfc28d]" />
                Open Email Case
              </NavLink>

              <NavLink to="/forensics" className="button-secondary">
                <Globe size={15} className="text-[#c8a96e]" />
                Inspect Domain Dossier
              </NavLink>
            </div>
          </div>

          {/* Right Column: Engraved Intelligence Atlas */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <CyberGlobe
              status={health}
              statusLabel={healthLabels[health]}
              className="h-72 w-full max-w-[400px]"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. KPI ARCHIVAL LEDGER PLAQUES (Manuscript Plaques)
          ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Plaque 1: Total Cases */}
        <div className="group relative rounded-xl border border-[#c8a96e]/25 bg-[#161122]/85 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200 hover:border-[#dfc28d]/50 hover:bg-[#1b1429]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#c8a96e]/30 bg-[#251b36] text-[#dfc28d]">
              <FileText size={18} />
            </div>
            <span className="font-serif text-[10px] text-[#c8a96e]/60">❖ 01</span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-[11px] font-bold tracking-wider uppercase text-[#a498b2]">
              Total Cases
            </div>
            <div className="mt-1 font-serif text-3xl font-extrabold tracking-tight text-[#f5ebd9]">
              {totalAnalysesCount}
            </div>
            <div className="mt-1 text-[11px] text-[#8d809c]">
              Archived in ledger
            </div>
          </div>
        </div>

        {/* Plaque 2: Threats Discovered */}
        <div className="group relative rounded-xl border border-[#c8a96e]/25 bg-[#161122]/85 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200 hover:border-[#b4384d]/50 hover:bg-[#1b1429]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#b4384d]/40 bg-[#2a131b] text-[#ff8a9a]">
              <Shield size={18} />
            </div>
            <span className="font-serif text-[10px] text-[#c8a96e]/60">❖ 02</span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-[11px] font-bold tracking-wider uppercase text-[#a498b2]">
              Threats Discovered
            </div>
            <div className="mt-1 font-serif text-3xl font-extrabold tracking-tight text-[#ff8a9a]">
              {threatsCount}
            </div>
            <div className="mt-1 text-[11px] text-[#8d809c]">
              Confirmed anomalies
            </div>
          </div>
        </div>

        {/* Plaque 3: High Risk */}
        <div className="group relative rounded-xl border border-[#c8a96e]/25 bg-[#161122]/85 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200 hover:border-[#e2a554]/50 hover:bg-[#1b1429]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2a554]/40 bg-[#2b1f10] text-[#ffd180]">
              <AlertTriangle size={18} />
            </div>
            <span className="font-serif text-[10px] text-[#c8a96e]/60">❖ 03</span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-[11px] font-bold tracking-wider uppercase text-[#a498b2]">
              High Risk
            </div>
            <div className="mt-1 font-serif text-3xl font-extrabold tracking-tight text-[#ffd180]">
              {highRiskCount}
            </div>
            <div className="mt-1 text-[11px] text-[#8d809c]">
              Requires scrutiny
            </div>
          </div>
        </div>

        {/* Plaque 4: System Status */}
        <div className="group relative rounded-xl border border-[#c8a96e]/25 bg-[#161122]/85 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-200 hover:border-[#558f70]/50 hover:bg-[#1b1429]">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#558f70]/40 bg-[#16271e] text-[#a8e6cf]">
              <Activity size={18} />
            </div>
            <span className="font-serif text-[10px] text-[#c8a96e]/60">❖ 04</span>
          </div>
          <div className="mt-4">
            <div className="font-serif text-[11px] font-bold tracking-wider uppercase text-[#a498b2]">
              System Status
            </div>
            <div className="mt-1 flex items-center gap-2 font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f5ebd9]">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health === "online"
                    ? "bg-[#558f70]"
                    : health === "degraded"
                    ? "bg-[#e2a554]"
                    : health === "offline"
                    ? "bg-[#b4384d]"
                    : "bg-[#dfc28d] animate-pulse"
                }`}
              />
              <span>{healthLabels[health]}</span>
            </div>
            <div className="mt-1 text-[11px] text-[#8d809c]">
              {health === "online"
                ? "Atelier connection active"
                : health === "degraded"
                ? "Atelier partially active"
                : health === "offline"
                ? "Atelier connection failed"
                : "Attuning connection…"}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3 & 4. LOWER SECTION: Activity Ledger & Recent Cases Folio
          ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Investigations Activity Ledger */}
        <div className="flex flex-col rounded-xl border border-[#c8a96e]/25 bg-[#161122]/85 p-6 shadow-[0_10px_35px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#c8a96e]/15">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c8a96e]/30 bg-[#251b36] text-[#dfc28d]">
                <Activity size={17} />
              </div>
              <div>
                <h2 className="font-serif text-sm font-bold tracking-wide text-[#f5ebd9]">
                  Investigation Telemetry
                </h2>
                <p className="text-xs text-[#a498b2]">
                  Persisted analysis risk telemetry from backend cases
                </p>
              </div>
            </div>

            <div className="font-serif text-[10px] text-[#dfc28d] border border-[#c8a96e]/20 px-2.5 py-1 rounded bg-[#1e1529]">
              Latest Run
            </div>
          </div>

          {analysis ? (() => {
            const score = run?.risk_score ?? ((probability(analysis) ?? 0) * 100);
            const normalized = Math.max(0, Math.min(100, score));
            const threatTier = normalized >= 70
              ? { label: "CRITICAL THREAT", color: "#b4384d", bg: "#2c1218", text: "#ff8a9a", border: "#b4384d/40" }
              : normalized >= 35
              ? { label: "SUSPICIOUS RISK", color: "#e2a554", bg: "#2d2011", text: "#ffd180", border: "#e2a554/40" }
              : { label: "BENIGN / SAFE", color: "#558f70", bg: "#16271e", text: "#a8e6cf", border: "#558f70/40" };

            // Circular Arc Calculations (Radius 64, Circumference 402.12)
            const radius = 64;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference - (normalized / 100) * circumference;

            return (
              <div className="mt-5 rounded-lg border border-[#c8a96e]/20 bg-[#120d1a]/90 p-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-serif border-b border-[#c8a96e]/15 pb-2">
                  <span className="font-bold tracking-wider uppercase text-[#dfc28d] flex items-center gap-1.5">
                    <span className="text-[#c8a96e]">❖</span> Circular Threat Assessment Dial
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-wider uppercase border"
                    style={{ backgroundColor: threatTier.bg, color: threatTier.text, borderColor: threatTier.color }}
                  >
                    {threatTier.label}
                  </span>
                </div>

                {/* Circular Dial Visual */}
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                  <div className="relative flex items-center justify-center">
                    <svg width="170" height="170" viewBox="0 0 170 170" className="transform -rotate-90">
                      {/* Outer Decorative Brass Ring */}
                      <circle
                        cx="85"
                        cy="85"
                        r="76"
                        fill="none"
                        stroke="#c8a96e"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                        strokeDasharray="3 4"
                      />

                      {/* Base Track */}
                      <circle
                        cx="85"
                        cy="85"
                        r={radius}
                        fill="none"
                        stroke="#251c36"
                        strokeWidth="10"
                      />

                      {/* Three Zone Guide Segments (Low / Medium / High) */}
                      {/* Safe segment: 0-35% */}
                      <circle
                        cx="85"
                        cy="85"
                        r={radius}
                        fill="none"
                        stroke="#558f70"
                        strokeWidth="2"
                        strokeDasharray={`${circumference * 0.35} ${circumference * 0.65}`}
                        strokeDashoffset="0"
                        opacity="0.35"
                      />
                      {/* Suspicious segment: 35-70% */}
                      <circle
                        cx="85"
                        cy="85"
                        r={radius}
                        fill="none"
                        stroke="#e2a554"
                        strokeWidth="2"
                        strokeDasharray={`${circumference * 0.35} ${circumference * 0.65}`}
                        strokeDashoffset={`-${circumference * 0.35}`}
                        opacity="0.35"
                      />
                      {/* Critical segment: 70-100% */}
                      <circle
                        cx="85"
                        cy="85"
                        r={radius}
                        fill="none"
                        stroke="#b4384d"
                        strokeWidth="2"
                        strokeDasharray={`${circumference * 0.30} ${circumference * 0.70}`}
                        strokeDashoffset={`-${circumference * 0.70}`}
                        opacity="0.35"
                      />

                      {/* Active Dynamic Risk Arc */}
                      <circle
                        cx="85"
                        cy="85"
                        r={radius}
                        fill="none"
                        stroke={threatTier.color}
                        strokeWidth="10"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{
                          filter: `drop-shadow(0 0 6px ${threatTier.color}80)`,
                        }}
                      />
                    </svg>

                    {/* Central Score Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="font-serif text-3xl font-extrabold tracking-tight text-[#f5ebd9]">
                        {normalized.toFixed(0)}
                      </span>
                      <span className="font-mono text-[10px] text-[#a498b2] uppercase tracking-wider">
                        / 100 RISK
                      </span>
                    </div>
                  </div>

                  {/* Threat Scale Ledger */}
                  <div className="space-y-2 text-xs w-full sm:w-auto">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#558f70]/30 bg-[#16271e]/50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#558f70]" />
                        <span className="font-serif text-[11px] font-semibold text-[#a8e6cf]">Low / Safe</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#a498b2]">0 – 34</span>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#e2a554]/30 bg-[#2d2011]/50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#e2a554]" />
                        <span className="font-serif text-[11px] font-semibold text-[#ffd180]">Suspicious</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#a498b2]">35 – 69</span>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#b4384d]/30 bg-[#2c1218]/50 px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#b4384d]" />
                        <span className="font-serif text-[11px] font-semibold text-[#ff8a9a]">Critical</span>
                      </div>
                      <span className="font-mono text-[10px] text-[#a498b2]">70 – 100</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#c8a96e]/10 pt-2.5 text-[11px] text-[#8d809c]">
                  <span>Evaluated via multi-modal AI & forensic sandbox</span>
                  <span className="font-mono text-[10px] text-[#dfc28d]">Score: {normalized.toFixed(1)}%</span>
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-1 flex-col items-center justify-center py-14 px-4 text-center rounded-lg border border-[#c8a96e]/10 bg-[#120d1a]/50 mt-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#c8a96e]/20 bg-[#1f162e] text-[#a498b2]">
                <BarChart size={20} />
              </div>
              <h3 className="mt-3 font-serif text-sm font-bold text-[#f5ebd9]">No activity recorded yet</h3>
              <p className="mt-1 max-w-sm text-xs text-[#a498b2]">Analysis telemetry will appear here as email cases or domains are investigated.</p>
            </div>
          )}
        </div>

        {/* Right: Recent Cases Folio */}
        <div className="flex flex-col rounded-xl border border-[#c8a96e]/25 bg-[#161122]/85 p-6 shadow-[0_10px_35px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#c8a96e]/15">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c8a96e]/30 bg-[#251b36] text-[#dfc28d]">
                <Clock size={17} />
              </div>
              <div>
                <h2 className="font-serif text-sm font-bold tracking-wide text-[#f5ebd9]">
                  Recent Case Records
                </h2>
                <p className="text-xs text-[#a498b2]">
                  Latest opened email cases & domain dossiers
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col justify-center mt-5">
            {analysis ? (
              <div className="rounded-lg border border-[#c8a96e]/25 bg-[#130d1c]/90 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-[10px] font-bold tracking-wider text-[#dfc28d] border border-[#c8a96e]/30 rounded px-2 py-0.5 bg-[#251b33]">
                        CASE RECORD
                      </span>
                      <span className="text-[11px] text-[#8d809c]">
                        {dateTime(analysis.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-serif text-sm font-bold text-[#f5ebd9] truncate">
                      {analysis.email.subject || "(no subject recorded)"}
                    </h3>
                    <p className="mt-0.5 text-xs text-[#a498b2] truncate">
                      Sender: {analysis.email.sender || "Unavailable"}
                    </p>
                  </div>

                  {/* Classification Seal */}
                  <ClassificationSeal
                    verdict={run?.verdict || analysis.label}
                    score={run?.risk_score ?? (probability(analysis) ? Math.round((probability(analysis) ?? 0) * 100) : null)}
                    size="sm"
                  />
                </div>

                {run && (
                  <div className="border-t border-[#c8a96e]/15 pt-3 flex items-center justify-between text-xs text-[#a498b2]">
                    <span className="truncate max-w-[220px] font-mono text-[11px] text-[#dfc28d]">
                      Target: {run.url}
                    </span>
                    <span className="font-serif">Score: {run.risk_score}/100</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-[#c8a96e]/10">
                  <NavLink
                    to={`/analyses/${analysis.id}`}
                    className="font-serif text-xs font-bold text-[#dfc28d] hover:text-white transition-colors"
                  >
                    Open Case File →
                  </NavLink>
                  {run && (
                    <NavLink
                      to={`/forensics/${run.id}`}
                      className="font-serif text-xs font-semibold text-[#a498b2] hover:text-[#dfc28d] transition-colors"
                    >
                      View Dossier →
                    </NavLink>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center py-14 px-4 text-center rounded-lg border border-[#c8a96e]/10 bg-[#120d1a]/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#c8a96e]/20 bg-[#1f162e] text-[#a498b2]">
                  <FileText size={20} />
                </div>
                <h3 className="mt-3 font-serif text-sm font-bold text-[#f5ebd9]">
                  No cases archived yet
                </h3>
                <p className="mt-1 max-w-sm text-xs text-[#a498b2]">
                  Deposit correspondence or inspect a target domain to populate the case ledger.
                </p>
                <div className="mt-5">
                  <NavLink to="/email-analysis" className="button text-xs py-2 px-4">
                    <Mail size={13} className="text-[#dfc28d]" />
                    Open New Case
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
