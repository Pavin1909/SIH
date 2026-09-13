import { FormEvent, ReactNode, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { ApiError, API_BASE_URL, api } from "./api";
import { Dashboard } from "./components/dashboard/Dashboard";
import { EmailAnalysisConsole } from "./components/analysis/EmailAnalysisConsole";
import { AnalysisDetailsView } from "./components/analysis/AnalysisDetailsView";
import { WebForensicsConsole } from "./components/forensics/WebForensicsConsole";
import { AppShell } from "./components/shell/AppShell";
import { Badge as UiBadge, EmptyState, ErrorState, LoadingState } from "./components/ui";
import type { Analysis, AnalysisWithEmail, EmailInfo, ForensicReport, ForensicRun, InfrastructureObservation, ProviderObservation } from "./types";
import { dateTime, percent, verdictTone } from "./utils";

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
    <div className="panel">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-slate-200">{value(item.domain || item.ip)}</strong>
        <Badge value={String(item.geoip_status || item.enrichment_status || item.status || unavailable)} />
      </div>
      <p className="mt-2 text-xs text-slate-500">Observed infrastructure location, not an attacker’s physical location.</p>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="label">IP</dt>
          <dd className="text-slate-200">{value(item.ip)}</dd>
        </div>
        <div>
          <dt className="label">Country / region / city</dt>
          <dd className="text-slate-200">{location}</dd>
        </div>
        <div>
          <dt className="label">ASN</dt>
          <dd className="text-slate-200">{value(item.asn)}</dd>
        </div>
        <div>
          <dt className="label">ISP / organization</dt>
          <dd className="text-slate-200">{value(item.isp || item.asn_org)}</dd>
        </div>
        <div>
          <dt className="label">VPN / TOR / proxy</dt>
          <dd className="text-slate-200">{flag(item.vpn)} / {flag(item.tor)} / {flag(item.proxy)}</dd>
        </div>
        <div>
          <dt className="label">Source/provider</dt>
          <dd className="text-slate-200">{value(item.source)}</dd>
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
      <section className="space-y-6">
        <div>
          <p className="label">Phase 3</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-100">Infrastructure intelligence</h1>
          <p className="mt-2 text-slate-400">Live DNS, IP, GeoIP, provider, and correlation evidence.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {observed.length ? (
            observed.map((item, index) => (
              <InfrastructureCard item={item} key={`${item.ip || item.domain}-${index}`} />
            ))
          ) : (
            <div className="panel text-slate-400">No infrastructure observations were returned by live providers.</div>
          )}
        </div>
        <div className="panel">
          <h2 className="font-semibold text-slate-100">Forensic report</h2>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-soc-950 p-4 text-xs text-slate-400 border border-soc-700/50">
            {report ? report.report_markdown : "The report endpoint is unavailable or requires the configured API key."}
          </pre>
        </div>
      </section>
    </State>
  );
}

/* Entry point handlers for shell navigation */
function ForensicsEntry() {
  const lastRun = cache.get<ForensicRun>("lastRun");
  if (lastRun?.id) {
    return <Navigate to={`/forensics/${lastRun.id}`} replace />;
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
  const lastRun = cache.get<ForensicRun>("lastRun");
  if (lastRun?.id) {
    return <Navigate to={`/infrastructure/${lastRun.id}`} replace />;
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

function ReportsView() {
  const lastRun = cache.get<ForensicRun>("lastRun");
  return (
    <section className="space-y-6">
      <div>
        <p className="label">Reporting</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Threat Reports</h1>
        <p className="mt-2 text-slate-400">
          Forensic evidence summaries generated from fused email, DOM, VLM, and infrastructure intelligence.
        </p>
      </div>
      {lastRun?.id ? (
        <div className="panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Latest Investigation Report</h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">{lastRun.url}</p>
            </div>
            <Badge value={lastRun.verdict} />
          </div>
          <div className="pt-2">
            <NavLink className="button-secondary text-xs" to={`/infrastructure/${lastRun.id}`}>
              View Forensic Report Details →
            </NavLink>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No reports generated"
          message="Forensic reports are automatically generated upon completion of an investigation run."
          action={
            <NavLink className="button" to="/email-analysis">
              Analyze an Email
            </NavLink>
          }
        />
      )}
    </section>
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
    <section className="space-y-6">
      <div>
        <p className="label">System</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Settings</h1>
        <p className="mt-2 text-slate-400">Platform configuration and backend connectivity.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel space-y-3">
          <h2 className="text-base font-semibold text-slate-100">Backend Connection</h2>
          <div className="text-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-soc-700/60 pb-2.5">
              <span className="text-slate-400">API Endpoint</span>
              <span className="font-mono text-xs text-cyan-400">{API_BASE_URL}</span>
            </div>
            <div className="flex items-center justify-between border-b border-soc-700/60 pb-2.5">
              <span className="text-slate-400">Health Status</span>
              <Badge value={health} />
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-400">Mode</span>
              <span className="font-mono text-xs text-slate-300">{import.meta.env.MODE || "production"}</span>
            </div>
          </div>
        </div>

        <div className="panel space-y-3">
          <h2 className="text-base font-semibold text-slate-100">Investigation Cache</h2>
          <div className="text-sm space-y-2.5">
            <div className="flex items-center justify-between border-b border-soc-700/60 pb-2.5">
              <span className="text-slate-400">Cached Analysis</span>
              <span className="font-mono text-xs text-slate-300">{lastAnalysis ? lastAnalysis.id.slice(0, 12) + "…" : "None"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-soc-700/60 pb-2.5">
              <span className="text-slate-400">Cached Forensic Run</span>
              <span className="font-mono text-xs text-slate-300">{lastRun ? lastRun.id.slice(0, 12) + "…" : "None"}</span>
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
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/settings" element={<SettingsView />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

