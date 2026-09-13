// DOM Element References
const connectionDot = document.getElementById("connection-dot");
const connectionLabel = document.getElementById("connection-label");
const pageDomain = document.getElementById("page-domain");
const pageTitle = document.getElementById("page-title");
const pageUrl = document.getElementById("page-url");

const scanBtn = document.getElementById("scan-btn");
const loadingPanel = document.getElementById("loading-panel");
const loadingStage = document.getElementById("loading-stage");

const resultCard = document.getElementById("result-card");
const verdictIcon = document.getElementById("verdict-icon");
const verdictLevel = document.getElementById("verdict-level");
const verdictText = document.getElementById("verdict-text");
const riskScoreVal = document.getElementById("risk-score-val");
const resultFindings = document.getElementById("result-findings");
const resultTimestamp = document.getElementById("result-timestamp");

const telemetryVlm = document.getElementById("telemetry-vlm");
const telemetryScreenshot = document.getElementById("telemetry-screenshot");
const telemetryIntel = document.getElementById("telemetry-intel");
const telemetryInfra = document.getElementById("telemetry-infra");

const errorPanel = document.getElementById("error-panel");
const errorTitle = document.getElementById("error-title");
const errorDetail = document.getElementById("error-detail");
const retryBtn = document.getElementById("retry-btn");

const viewInvestigationBtn = document.getElementById("view-investigation-btn");
const optionsBtn = document.getElementById("options-btn");

let currentTabUrl = "";
let currentTabTitle = "";

// Parse Domain from URL safely
function getDomain(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname || "—";
  } catch {
    return "—";
  }
}

// Map status / verdict to Phase 1 Risk Level
function mapRiskLevel(result) {
  if (!result) return { level: "READY TO SCAN", tone: "idle" };
  if (result.status === "error") return { level: "SCAN ERROR", tone: "error" };

  const verdict = String(result.verdict || result.status || "").toUpperCase();
  const riskScore = result.riskScore;
  const prob = result.phishingProbability ?? result.urlPhishingProbability;

  if (verdict === "CONFIRMED_MALICIOUS" || verdict === "MALICIOUS" || verdict === "CRITICAL" || (riskScore && riskScore >= 75)) {
    return { level: "MALICIOUS", tone: "malicious" };
  }
  if (verdict === "HIGH" || verdict === "HIGH_RISK" || verdict === "HIGH RISK" || (riskScore && riskScore >= 50)) {
    return { level: "HIGH RISK", tone: "high-risk" };
  }
  if (verdict === "SUSPICIOUS" || (riskScore && riskScore >= 30) || (prob && prob >= 0.35)) {
    return { level: "SUSPICIOUS", tone: "suspicious" };
  }
  if (verdict === "SAFE" || verdict === "BENIGN" || verdict === "LEGITIMATE" || result.status === "safe") {
    return { level: "SAFE", tone: "safe" };
  }

  return { level: verdict || "SAFE", tone: "safe" };
}

// Render Result State
function renderResult(result) {
  loadingPanel.hidden = true;
  errorPanel.hidden = true;
  resultCard.hidden = false;
  scanBtn.disabled = false;

  if (!result) {
    resultCard.className = "result-card result-idle";
    verdictIcon.textContent = "•";
    verdictLevel.textContent = "READY TO SCAN";
    verdictText.textContent = "No active investigation";
    riskScoreVal.textContent = "—";
    resultFindings.textContent = "Click “Analyze This Page” to initiate sandbox forensics, DOM evaluation, and threat detection.";
    resultTimestamp.textContent = "";
    viewInvestigationBtn.hidden = true;
    return;
  }

  if (result.status === "error") {
    renderError(result.error || "The analysis failed.");
    return;
  }

  const { level, tone } = mapRiskLevel(result);

  resultCard.className = `result-card result-${tone}`;
  verdictLevel.textContent = level;
  verdictText.textContent = result.verdict || "Analysis Complete";

  verdictIcon.textContent = tone === "safe" ? "✓" : tone === "malicious" ? "!" : tone === "high-risk" ? "!" : tone === "suspicious" ? "?" : "•";

  if (result.riskScore !== null && result.riskScore !== undefined) {
    riskScoreVal.textContent = `${result.riskScore}/100`;
  } else {
    riskScoreVal.textContent = "—";
  }

  // Key Finding Text
  if (result.verdict === "CONFIRMED_MALICIOUS" || tone === "malicious") {
    resultFindings.textContent = "Elevated threat detected. Sandbox inspection identified malicious signatures or phishing indicators.";
  } else if (tone === "suspicious" || tone === "high-risk") {
    resultFindings.textContent = `Suspicious patterns observed. Phishing probability evaluated at ${Math.round(((result.phishingProbability ?? result.urlPhishingProbability) || 0) * 100)}%.`;
  } else {
    resultFindings.textContent = "No malicious heuristics or phishing behaviors detected on this page.";
  }

  // Timestamp
  if (result.scannedAt) {
    try {
      resultTimestamp.textContent = `Scanned at ${new Date(result.scannedAt).toLocaleTimeString()}`;
    } catch {
      resultTimestamp.textContent = "";
    }
  } else {
    resultTimestamp.textContent = "";
  }

  // Collapsed Details
  telemetryVlm.textContent = result.aiStatus || "Unavailable";
  telemetryScreenshot.textContent = result.evidence?.browser?.screenshot_available ? "Captured" : "Unavailable";
  telemetryIntel.textContent = result.evidence ? "Evaluated" : "—";

  if (result.geoip && result.geoip.country) {
    const loc = [result.geoip.city, result.geoip.country].filter(Boolean).join(", ");
    telemetryInfra.textContent = `${loc} (${result.geoip.ip || "IP"})`;
  } else {
    telemetryInfra.textContent = "—";
  }

  // Full Investigation Link
  const dashboard = result.dashboardUrl || "http://localhost:5173";
  if (result.runId) {
    viewInvestigationBtn.hidden = false;
    viewInvestigationBtn.href = `${dashboard}/forensics/${result.runId}`;
  } else if (result.analysisId) {
    viewInvestigationBtn.hidden = false;
    viewInvestigationBtn.href = `${dashboard}/analyses/${result.analysisId}`;
  } else {
    viewInvestigationBtn.hidden = true;
  }
}

// Render Error State
function renderError(message) {
  loadingPanel.hidden = true;
  resultCard.hidden = true;
  errorPanel.hidden = false;
  scanBtn.disabled = false;

  errorTitle.textContent = "Scan Failure";
  errorDetail.textContent = message || "Unable to connect to ThreatTrace backend.";
}

// Check Backend Connection Health
async function checkHealth() {
  connectionLabel.textContent = "Checking";
  connectionDot.className = "connection-dot";

  try {
    const res = await fetch("http://localhost:8000/health", { cache: "no-store" });
    if (res.ok) {
      connectionDot.className = "connection-dot online";
      connectionLabel.textContent = "Online";
      return true;
    }
  } catch {
    /* backend offline */
  }

  connectionDot.className = "connection-dot offline";
  connectionLabel.textContent = "Offline";
  return false;
}

// Initialize Popup
async function init() {
  // 1. Inspect Active Tab
  if (typeof chrome !== "undefined" && chrome.tabs?.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs?.[0];
      if (activeTab && activeTab.url) {
        currentTabUrl = activeTab.url;
        currentTabTitle = activeTab.title || "";

        pageDomain.textContent = getDomain(currentTabUrl);
        pageTitle.textContent = currentTabTitle || "Active Webpage";
        pageUrl.textContent = currentTabUrl;
        pageUrl.title = currentTabUrl;

        if (currentTabUrl.startsWith("chrome://") || currentTabUrl.startsWith("edge://")) {
          scanBtn.disabled = true;
          pageTitle.textContent = "Internal Browser Page (Cannot scan)";
        }
      }
    });
  }

  // 2. Health check
  await checkHealth();

  // 3. Load previous scan result if any
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const { lastResult } = await chrome.storage.local.get("lastResult");
    renderResult(lastResult || null);
  } else {
    renderResult(null);
  }
}

// Trigger Webpage Analysis
async function triggerAnalysis() {
  if (!currentTabUrl || currentTabUrl.startsWith("chrome://")) return;

  const isOnline = await checkHealth();
  if (!isOnline) {
    renderError("Unable to connect to ThreatTrace backend on http://localhost:8000. Ensure the FastAPI server is running.");
    return;
  }

  scanBtn.disabled = true;
  resultCard.hidden = true;
  errorPanel.hidden = true;
  loadingPanel.hidden = false;

  loadingStage.textContent = "Submitting URL to sandbox…";

  const domain = getDomain(currentTabUrl);
  const scanPayload = {
    sender: "browser.extension@threattrace.local",
    subject: `Page Security Scan: ${domain}`,
    body: `Target webpage inspection: ${currentTabUrl}`,
    urls: [currentTabUrl],
    messageKey: `tab-scan|${currentTabUrl}`,
  };

  // Stage update timer
  const stageTimer = setTimeout(() => {
    loadingStage.textContent = "Executing Playwright sandbox & VLM…";
  }, 2500);

  try {
    chrome.runtime.sendMessage(
      { type: "SCAN_GMAIL_EMAIL", email: scanPayload },
      (response) => {
        clearTimeout(stageTimer);
        if (chrome.runtime.lastError) {
          renderError(chrome.runtime.lastError.message);
          return;
        }
        if (!response || response.status === "error") {
          renderError(response?.error || "The analysis failed.");
          return;
        }
        renderResult(response);
      }
    );
  } catch (err) {
    clearTimeout(stageTimer);
    renderError(err instanceof Error ? err.message : "Failed to communicate with extension background.");
  }
}

// Event Listeners
scanBtn.addEventListener("click", triggerAnalysis);
retryBtn.addEventListener("click", () => {
  checkHealth().then((online) => {
    if (online) init();
  });
});
optionsBtn.addEventListener("click", () => {
  if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
});

// Run Init
init();
