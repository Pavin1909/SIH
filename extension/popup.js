const title = document.getElementById("status");
const detail = document.getElementById("detail");
const card = document.getElementById("status-card");
const icon = document.getElementById("status-icon");
const verdict = document.getElementById("verdict");
const risk = document.getElementById("risk");
const link = document.getElementById("investigation");
const connection = document.getElementById("connection");

function setStatus(result) {
  const state = result?.status || "idle";
  card.className = `status-card status-${state}`;
  icon.textContent = state === "safe" ? "✓" : state === "malicious" ? "!" : state === "suspicious" ? "?" : state === "error" ? "×" : "•";
  title.textContent = state === "safe" ? "Analysis complete" : state === "suspicious" ? "Suspicious email" : state === "malicious" ? "Potentially malicious" : state === "error" ? "Analysis failed" : "Ready to scan";
  detail.textContent = result?.error || result?.verdict || (state === "idle" ? "Open a Gmail message to start an automatic analysis." : `Phishing probability: ${Math.round((result?.phishingProbability || 0) * 100)}%`);
  verdict.textContent = result?.verdict || (state === "idle" ? "—" : state);
  risk.textContent = result?.riskScore === null || result?.riskScore === undefined ? "—" : `${result.riskScore}/100`;
  if (result?.analysisId) { link.hidden = false; link.href = `${result.dashboardUrl}/analyses/${result.analysisId}`; }
}

async function refresh() {
  const { lastResult } = await chrome.storage.local.get("lastResult");
  setStatus(lastResult);
  try { await fetch("http://localhost:8000/health"); connection.className = "connection-dot online"; } catch { connection.className = "connection-dot offline"; }
}

refresh();
document.getElementById("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
