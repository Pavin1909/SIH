const DEFAULTS = { backendUrl: "http://localhost:8000", dashboardUrl: "http://localhost:3000" };
const inFlight = new Map();
const completed = new Map();
function log(...args) { console.info("[SandBoxTrace background]", ...args); }
function trimUrl(value) { return String(value || "").replace(/\/$/, ""); }
async function settings() { return { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) }; }
function header(value) { return String(value || "").replace(/[\r\n]+/g, " ").trim(); }
function emailFile(email) {
  const links = Array.isArray(email.urls) && email.urls.length ? `\n\nLinks observed by Gmail:\n${email.urls.join("\n")}` : "";
  const lines = [`From: ${header(email.sender) || "unknown@example.invalid"}`, "To: analyst@sandboxtrace.invalid", `Subject: ${header(email.subject) || "(no subject)"}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "", `${String(email.body || "")}${links}`, ""];
  return new File([lines.join("\r\n")], "gmail-message.eml", { type: "message/rfc822" });
}
async function fetchWithTimeout(url, options, timeout = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { log("fetch", options.method || "GET", url); return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
async function responseJson(response, label) {
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { detail: text }; }
  log(label, response.status, body);
  if (!response.ok) throw new Error(body.detail || `${label} failed (${response.status})`);
  if (!body || typeof body !== "object") throw new Error(`${label} returned malformed JSON`);
  return body;
}
function statusFor(analysis, forensic) {
  if (forensic) return forensic.verdict === "CONFIRMED_MALICIOUS" ? "malicious" : forensic.verdict === "SUSPICIOUS" ? "suspicious" : "safe";
  const probability = analysis.email_phishing_probability;
  if (probability === null || probability === undefined) return "safe";
  return probability >= 0.75 ? "malicious" : probability >= 0.35 ? "suspicious" : "safe";
}
function validateAnalysis(analysis) {
  if (!analysis?.id || !analysis.email || !Array.isArray(analysis.email.urls)) throw new Error("Backend returned malformed analysis data.");
}
async function scan(email) {
  const existing = completed.get(email.messageKey);
  if (existing) return existing;
  if (inFlight.has(email.messageKey)) return inFlight.get(email.messageKey);
  const job = (async () => {
    const config = await settings();
    const form = new FormData(); form.append("file", emailFile(email));
    const analysis = await responseJson(await fetchWithTimeout(`${trimUrl(config.backendUrl)}/api/v1/emails/analyze`, { method: "POST", body: form }), "email analysis");
    validateAnalysis(analysis);
    let forensic = null;
    if (analysis.email.urls.length) {
      const url = analysis.email.urls[0];
      if (!url?.id) throw new Error("Backend returned a URL without an ID.");
      forensic = await responseJson(await fetchWithTimeout(`${trimUrl(config.backendUrl)}/api/v1/analyses/${analysis.id}/forensics/${url.id}`, { method: "POST" }, 300000), "forensic analysis");
    } else if (email.urls.length) {
      throw new Error("Backend did not extract the URL from the Gmail message. Refresh Gmail and try again.");
    }
    const vlm = forensic?.provider_observations?.find((item) => item.provider === "vlm");
    const infrastructure = Array.isArray(forensic?.fused_evidence?.infrastructure) ? forensic.fused_evidence.infrastructure[0] : null;
    const result = { status: statusFor(analysis, forensic), analysisStatus: "complete", analysisId: analysis.id, runId: forensic?.id || null, phishingProbability: analysis.email_phishing_probability, urlPhishingProbability: analysis.url_phishing_probability, verdict: forensic?.verdict || null, riskScore: forensic?.risk_score ?? null, aiStatus: vlm?.status || "unavailable", evidence: forensic?.fused_evidence || {}, geoip: infrastructure ? { ip: infrastructure.ip, country: infrastructure.country, region: infrastructure.region, city: infrastructure.city, asn: infrastructure.asn, isp: infrastructure.isp || infrastructure.asn_org, vpn: infrastructure.vpn, tor: infrastructure.tor, source: infrastructure.source, status: infrastructure.geoip_status } : null, dashboardUrl: trimUrl(config.dashboardUrl), scannedAt: new Date().toISOString() };
    completed.set(email.messageKey, result);
    if (completed.size > 100) completed.delete(completed.keys().next().value);
    await chrome.storage.local.set({ lastResult: result });
    return result;
  })();
  inFlight.set(email.messageKey, job);
  try { return await job; } finally { inFlight.delete(email.messageKey); }
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SCAN_GMAIL_EMAIL") return;
  log("scan requested", message.email?.messageKey);
  scan(message.email).then(sendResponse).catch((error) => {
    log("scan failed", error);
    const unavailable = error?.name === "AbortError" || error instanceof TypeError || /fetch|network|connection/i.test(error?.message || "");
    sendResponse({ status: "error", analysisStatus: "failed", error: unavailable ? "Backend unavailable — start FastAPI server." : error?.message || "The analysis failed." });
  });
  return true;
});
