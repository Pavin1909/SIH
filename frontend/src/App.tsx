import { FormEvent, ReactNode, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ApiError, API_BASE_URL, api } from "./api";
import { Dashboard } from "./components/dashboard/Dashboard";
import { EmailAnalysisConsole } from "./components/analysis/EmailAnalysisConsole";
import { AnalysisDetailsView } from "./components/analysis/AnalysisDetailsView";
import { WebForensicsConsole } from "./components/forensics/WebForensicsConsole";
import { GeoMap } from "./components/GeoMap";
import { ReportsPage } from "./components/reports/ReportsPage";
import { AppShell } from "./components/shell/AppShell";
import { Badge as UiBadge, EmptyState, ErrorState, LoadingState } from "./components/ui";
import type { Analysis, AnalysisWithEmail, EmailInfo, ForensicReport, ForensicRun, InfrastructureObservation, ProviderObservation } from "./types";
import { dateTime, getStoredInvestigationIds, percent, verdictTone } from "./utils";

const unavailable = "Unavailable";
const cache = { get<T>(key: string): T | null { try { return JSON.parse(localStorage.getItem(key) || "null") as T | null; } catch { return null; } }, set(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); } };
function value(value: unknown) { return value === null || value === undefined || value === "" ? unavailable : String(value); }
function flag(value: unknown) { return typeof value === "boolean" ? (value ? "Yes" : "No") : unavailable; }
function items(run: ForensicRun) { return Array.isArray(run.fused_evidence.infrastructure) ? run.fused_evidence.infrastructure as InfrastructureObservation[] : []; }
function probability(analysis: Analysis) { return analysis.phishing_probability ?? analysis.email_phishing_probability ?? analysis.url_phishing_probability; }

function State({ loading, error, empty, children }: { loading?: boolean; error?: unknown; empty?: boolean; children?: ReactNode }) {
  if (loading) return <LoadingState message="Loading investigation data…" />;
  if (error) return <ErrorState message={error instanceof ApiError ? error.message : String(error || "Unable to load this data.")} />;
  if (empty) return <EmptyState title="No investigation data" message="No investigation has been started yet." />;
  return <>{children}</>;
}

function Badge({ value }: { value: string }) {
  return <UiBadge value={value} />;
}

function Metric({ label, value: metricValue, hint }: { label: string; value: ReactNode; hint?: string }) {
  if (label === "Model confidence") return null;
  return (
    <div className="panel">
      <p className="label">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{metricValue}</div>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function ProviderCard({ item }: { item: ProviderObservation }) {
  const response = item.response || {};
  const error = response.error || response.detail || response.message;
  const errorText = error === null || error === undefined ? "" : String(error);
  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-3">
        <strong className="capitalize text-slate-200">{item.provider}</strong>
        <Badge value={item.status} />
      </div>
      {errorText && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
          {errorText}
        </p>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400">
          View provider response
        </summary>
        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-soc-950/80 p-3 text-xs text-slate-400 border border-soc-700/50">
          {JSON.stringify(response, null, 2)}
        </pre>
      </details>
    </div>
  );
}






function InfrastructureCard({ item }: { item: InfrastructureObservation }) {
  const location = [item.city, item.region, item.country].filter(Boolean).join(", ") || unavailable;
  return (
    <div className="relative rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-5 shadow-lg backdrop-blur-xl">
      <span className="pointer-events-none absolute top-1.5 left-2 font-serif text-[9px] text-[#c8a96e]/50 select-none">❖</span>
      <span className="pointer-events-none absolute top-1.5 right-2 font-serif text-[9px] text-[#c8a96e]/50 select-none">❖</span>
      <div className="flex items-center justify-between gap-3">
        <strong className="font-serif text-sm font-bold text-[#dfc28d]">{value(item.domain || item.ip)}</strong>
        <span className="rounded border border-[#c8a96e]/30 bg-[#251b33] px-2 py-0.5 font-serif text-[10px] font-bold text-[#dfc28d]">
          {String(item.geoip_status || item.enrichment_status || item.status || unavailable).toUpperCase()}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-[#a498b2]">Cartographic server node, not an attacker’s physical location.</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <dt className="label">IP Address</dt>
          <dd className="font-mono text-[11px] text-[#e8e1d5] mt-0.5">{value(item.ip)}</dd>
        </div>
        <div>
          <dt className="label">Location</dt>
          <dd className="text-[#e8e1d5] mt-0.5">{location}</dd>
        </div>
        <div>
          <dt className="label">ASN</dt>
          <dd className="font-mono text-[11px] text-[#e8e1d5] mt-0.5">{value(item.asn)}</dd>
        </div>
        <div>
          <dt className="label">ISP / Organization</dt>
          <dd className="text-[#e8e1d5] mt-0.5">{value(item.isp || item.asn_org)}</dd>
        </div>
        <div>
          <dt className="label">VPN / TOR / Proxy</dt>
          <dd className="text-[#e8e1d5] mt-0.5">{flag(item.vpn)} / {flag(item.tor)} / {flag(item.proxy)}</dd>
        </div>
        <div>
          <dt className="label">Intelligence Provider</dt>
          <dd className="font-mono text-[11px] text-[#dfc28d] mt-0.5">{value(item.source)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Infrastructure() {
  const { runId = "" } = useParams();
  const [run, setRun] = useState<ForensicRun | null>(null);
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.forensics(runId);
        setRun(result);
        try {
          setReport(await api.report(runId));
        } catch {
          /* report may require API credentials */
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Infrastructure could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, [runId]);

  const observed = run ? items(run) : [];

  return (
    <State loading={loading} error={error} empty={!run}>
      <section className="space-y-6 animate-in fade-in duration-300">
        <div className="border-b border-[#c8a96e]/15 pb-4">
          <div className="inline-flex items-center gap-2 rounded border border-[#c8a96e]/30 bg-[#251b33] px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
            <span>❖</span>
            <span>Chapter 04 • Threat Atlas</span>
          </div>
          <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold text-[#f5ebd9]">Geospatial Threat Atlas</h1>
          <p className="mt-1 text-xs text-[#a498b2]">Live topological server coordinates, DNS, IP reputation, and correlation evidence.</p>
        </div>
        <GeoMap observations={observed} />
        <div className="grid gap-4 md:grid-cols-2">
          {observed.length ? (
            observed.map((item, index) => (
              <InfrastructureCard item={item} key={`${item.ip || item.domain}-${index}`} />
            ))
          ) : (
            <div className="panel text-xs text-[#a498b2]">No infrastructure observations were returned by live providers.</div>
          )}
        </div>
        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-5 shadow-lg">
          <h2 className="font-serif text-sm font-bold tracking-wide text-[#dfc28d]">Forensic Intelligence Transcript</h2>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-[#120d1a] p-4 text-xs font-serif text-[#d5cbbd] border border-[#c8a96e]/15 leading-relaxed">
            {report ? report.report_markdown : "The report endpoint is unavailable or requires the configured API key."}
          </pre>
        </div>
      </section>
    </State>
  );
}

/* Entry point handlers for shell navigation */
function ForensicsEntry() {
  const [targetId, setTargetId] = useState<string | null>(() => {
    const lastRun = cache.get<ForensicRun>("lastRun");
    return lastRun?.id || getStoredInvestigationIds()[0] || null;
  });
  const [checking, setChecking] = useState<boolean>(!targetId);

  useEffect(() => {
    if (targetId) return;
    let active = true;
    api.latestInvestigation().then((latest) => {
      if (active && latest.forensic?.id) {
        setTargetId(latest.forensic.id);
      }
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [targetId]);

  if (targetId) {
    return <Navigate to={`/forensics/${targetId}`} replace />;
  }
  if (checking) {
    return <LoadingState message="Checking active investigations…" />;
  }
  return (
    <div className="py-6">
      <EmptyState
        title="No active investigation"
        message="Start an email analysis to begin a webpage forensic investigation."
        action={
          <NavLink className="button" to="/email-analysis">
            Start Analysis
          </NavLink>
        }
      />
    </div>
  );
}

function InfrastructureEntry() {
  const [targetId, setTargetId] = useState<string | null>(() => {
    const lastRun = cache.get<ForensicRun>("lastRun");
    return lastRun?.id || getStoredInvestigationIds()[0] || null;
  });
  const [checking, setChecking] = useState<boolean>(!targetId);

  useEffect(() => {
    if (targetId) return;
    let active = true;
    api.latestInvestigation().then((latest) => {
      if (active && latest.forensic?.id) {
        setTargetId(latest.forensic.id);
      }
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
  }, [targetId]);

  if (targetId) {
    return <Navigate to={`/infrastructure/${targetId}`} replace />;
  }
  if (checking) {
    return <LoadingState message="Checking active investigations…" />;
  }
  return (
    <div className="py-6">
      <EmptyState
        title="No active infrastructure investigation"
        message="Start an email analysis and inspect a target URL to observe infrastructure intelligence."
        action={
          <NavLink className="button" to="/email-analysis">
            Start Analysis
          </NavLink>
        }
      />
    </div>
  );
}

function SettingsView() {
  const [health, setHealth] = useState("checking");
  const lastAnalysis = cache.get<AnalysisWithEmail>("lastAnalysis");
  const lastRun = cache.get<ForensicRun>("lastRun");

  useEffect(() => {
    api
      .health()
      .then((res) => setHealth(res?.status || "online"))
      .catch(() => setHealth("offline"));
  }, []);

  function clearCache() {
    localStorage.removeItem("lastAnalysis");
    localStorage.removeItem("lastRun");
    window.location.reload();
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-[#c8a96e]/15 pb-4">
        <div className="inline-flex items-center gap-2 rounded border border-[#c8a96e]/30 bg-[#251b33] px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-widest text-[#dfc28d] uppercase">
          <span>❖</span>
          <span>Chapter 06 • Atelier & System</span>
        </div>
        <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-extrabold text-[#f5ebd9]">Atelier Settings</h1>
        <p className="mt-1 text-xs text-[#a498b2]">Platform configuration, backend connectivity, and case cache ledger.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-5 shadow-lg space-y-3">
          <h2 className="font-serif text-sm font-bold tracking-wide text-[#dfc28d]">Backend Atelier Connection</h2>
          <div className="text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2.5">
              <span className="text-[#a498b2]">API Endpoint</span>
              <span className="font-mono text-xs text-[#dfc28d]">{API_BASE_URL}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2.5">
              <span className="text-[#a498b2]">Atelier Status</span>
              <Badge value={health} />
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[#a498b2]">Mode</span>
              <span className="font-mono text-xs text-[#e8e1d5]">{import.meta.env.MODE || "production"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#161122]/90 p-5 shadow-lg space-y-3">
          <h2 className="font-serif text-sm font-bold tracking-wide text-[#dfc28d]">Case Cache Ledger</h2>
          <div className="text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2.5">
              <span className="text-[#a498b2]">Cached Correspondence</span>
              <span className="font-mono text-xs text-[#e8e1d5]">{lastAnalysis ? lastAnalysis.id.slice(0, 16) + "…" : "None"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-2.5">
              <span className="text-[#a498b2]">Cached Specimen Run</span>
              <span className="font-mono text-xs text-[#e8e1d5]">{lastRun ? lastRun.id.slice(0, 16) + "…" : "None"}</span>
            </div>
          </div>
          <div className="pt-2">
            <button onClick={clearCache} className="button-secondary text-xs">
              Clear Investigation Cache
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        {/* Existing core routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/email-analysis" element={<EmailAnalysisConsole />} />
        <Route path="/analyses/:analysisId" element={<AnalysisDetailsView />} />
        <Route path="/forensics/:runId" element={<WebForensicsConsole />} />
        <Route path="/infrastructure/:runId" element={<Infrastructure />} />

        {/* Shell entry routes */}
        <Route path="/forensics" element={<ForensicsEntry />} />
        <Route path="/infrastructure" element={<InfrastructureEntry />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportId" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsView />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

