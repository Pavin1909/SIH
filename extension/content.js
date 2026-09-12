let candidateKey = "";
let candidateSince = 0;
let activeEmail = null;
const scannedKeys = new Set();

function log(message, data) { console.info(`[SandBoxTrace] ${message}`, data || ""); }
function text(selector) { return document.querySelector(selector)?.textContent?.trim() || ""; }

function emailData() {
  const body = document.querySelector("div[role='main'] div.a3s")
    || document.querySelector("div[role='main'] div[dir='ltr']")
    || document.querySelector("div[role='main'] [data-message-id]");
  if (!body?.textContent?.trim()) return null;
  const senderNode = document.querySelector("span[email], h2[email], [data-hovercard-id^='mailto:']");
  const sender = senderNode?.getAttribute("email") || text("span[email], h2[email]");
  const subject = text("h2.hP") || text("div[role='main'] h2");
  const bodyText = body.textContent.trim();
  const linkedUrls = [...body.querySelectorAll("a[href]")]
    .map((link) => link.href)
    .filter((url) => /^https?:/i.test(url));
  const visibleUrls = bodyText.match(/https?:\/\/[^\s<>"']+/gi) || [];
  const urls = [...new Set([...linkedUrls, ...visibleUrls])];
  // Gmail's hash normally contains the thread/message identity. The content prefix
  // covers views where Gmail keeps the hash while replacing the message DOM.
  const messageKey = `${location.hash}|${sender}|${subject}|${bodyText.slice(0, 1000)}`;
  return { sender, subject, body: bodyText, urls, messageKey };
}

function panel() {
  let node = document.getElementById("sandboxtrace-gmail-banner");
  if (!node) {
    node = document.createElement("div");
    node.id = "sandboxtrace-gmail-banner";
    document.body.prepend(node);
  }
  return node;
}

function renderPanel({ state, title, detail, email, result }) {
  const node = panel();
  node.className = `sandboxtrace-banner sandboxtrace-${state}`;
  node.replaceChildren();
  const heading = document.createElement("strong");
  heading.textContent = title;
  const message = document.createElement("span");
  message.textContent = detail;
  node.append(heading, message);

  if (result?.analysisId) {
    const link = document.createElement("a");
    link.textContent = "Open investigation";
    link.href = `${result.dashboardUrl}/analyses/${result.analysisId}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    node.append(link);
  }

  if (email && state !== "scanning") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = state === "error" ? "Analyze again" : "Analyze again";
    button.addEventListener("click", () => startScan(email, true));
    node.append(button);
  }
  return node;
}

function showScanning(email) {
  renderPanel({ state: "scanning", title: "SandBoxTrace", detail: "Analyzing email…", email });
}

function showResult(result, email) {
  const status = result?.status || "error";
  const title = status === "malicious" ? "Potentially malicious email"
    : status === "suspicious" ? "Suspicious email"
    : status === "safe" ? "Analysis complete"
    : "Analysis failed";
  const geo = result?.geoip;
  const geoText = geo?.status === "ok" ? `${geo.country || "Unavailable"}/${geo.region || geo.city || "Unavailable"}` : "Unavailable";
  const detail = result?.error || `Verdict: ${result?.verdict || status} · Risk: ${result?.riskScore ?? "Unavailable"} · AI: ${result?.aiStatus || "Unavailable"} · GeoIP: ${geoText}`;
  renderPanel({ state: status, title, detail, email, result });
}

function startScan(email, force = false) {
  if (!email || (!force && scannedKeys.has(email.messageKey))) return;
  scannedKeys.add(email.messageKey);
  activeEmail = email;
  showScanning(email);
  log("analysis started", { messageKey: email.messageKey });
  try {
    chrome.runtime.sendMessage({ type: "SCAN_GMAIL_EMAIL", email }, (result) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        log("analysis failed", runtimeError.message);
        showResult({ status: "error", error: "Backend unavailable — start FastAPI server." }, email);
        return;
      }
      log("API response", result);
      if (!result || typeof result.status !== "string") {
        log("analysis failed", "Malformed extension response");
        showResult({ status: "error", error: "The backend returned an invalid analysis response." }, email);
        return;
      }
      if (result.status === "error") log("analysis failed", result.error);
      showResult(result, email);
    });
  } catch (error) {
    log("analysis failed", error);
    showResult({ status: "error", error: "Backend unavailable — start FastAPI server." }, email);
  }
}

function detectMessage() {
  const data = emailData();
  if (!data) return;
  if (data.messageKey !== candidateKey) {
    candidateKey = data.messageKey;
    candidateSince = Date.now();
    log("message detected", { messageKey: data.messageKey });
    log("payload created", { sender: data.sender, subject: data.subject, urls: data.urls.length });
    activeEmail = data;
    showScanning(data);
    return;
  }
  // Require a stable DOM identity before starting. This prevents Gmail's partial
  // message render from generating duplicate or incomplete requests.
  if (Date.now() - candidateSince >= 800) startScan(data);
}

const observer = new MutationObserver(() => detectMessage());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", () => { candidateKey = ""; candidateSince = 0; detectMessage(); });
setInterval(detectMessage, 1000);
detectMessage();
