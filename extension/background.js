const DEFAULTS = { backendUrl: "http://localhost:8000", dashboardUrl: "http://localhost:3000" };
const inFlight = new Map();
const completed = new Map();

function trimUrl(value) { return String(value || "").replace(/\/$/, ""); }
async function settings() { return { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) }; }
function header(value) { return String(value || "").replace(/[\r\n]+/g, " ").trim(); }
function emailFile(email) {
  const lines = [
    `From: ${header(email.sender) || "unknown@example.invalid"}`,
    "To: analyst@sandboxtrace.invalid",
    `Subject: ${header(email.subject) || "(no subject)"}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    String(email.body || ""),
    "",
  ];
  return new File([lines.join("\r\n")], "gmail-message.eml", { type: "message/rfc822" });
}
async function fetchWithTimeout(url, options, timeout = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); }
}
async function responseJson(response) {
  const text = await response.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { detail: text }; }
  if (!response.ok) throw new Error(body.detail || `Backend request failed (${response.status})`);
  return body;
}
function statusFor(analysis, forensic) {
  if (forensic) {
    if (forensic.verdict === "CONFIRMED_MALICIOUS") return "malicious";
    if (forensic.verdict === "SUSPICIOUS") return "suspicious";
    return "safe";
  }
  if (analysis.email_phishing_probability === null || analysis.email_phishing_probability === undefined) return "safe";
  if (analysis.email_phishing_probability >= 0.75) return "malicious";
  if (analysis.email_phishing_probability >= 0.35) return "suspicious";
  return "safe";
}
async function scan(email) {
  const existing = completed.get(email.messageKey);
  if (existing) return existing;
  if (inFlight.has(email.messageKey)) return inFlight.get(email.messageKey);
  const job = (async () => {
    const config = await settings();
    const form = new FormData(); form.append("file", emailFile(email));
    const analysis = await responseJson(await fetchWithTimeout(`${trimUrl(config.backendUrl)}/api/v1/emails/analyze`, { method: "POST", body: form }));
    let forensic = null;
    if (analysis.email.urls.length) {
      forensic = await responseJson(await fetchWithTimeout(`${trimUrl(config.backendUrl)}/api/v1/analyses/${analysis.id}/forensics/${analysis.email.urls[0].id}`, { method: "POST" }, 150000));
    }
    const result = { status: statusFor(analysis, forensic), analysisId: analysis.id, runId: forensic?.id || null, phishingProbability: analysis.email_phishing_probability, urlPhishingProbability: analysis.url_phishing_probability, verdict: forensic?.verdict || null, dashboardUrl: trimUrl(config.dashboardUrl), scannedAt: new Date().toISOString() };
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
  scan(message.email).then(sendResponse).catch((error) => sendResponse({ status: "error", error: error.name === "AbortError" ? "The SandBoxTrace backend timed out." : error.message }));
  return true;
});
