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
  const messageKey = `${location.hash}|${sender}|${subject}|${bodyText.slice(0, 1000)}`;
  return { sender, subject, body: bodyText, urls, messageKey };
}

// ── Shadow DOM banner host ──────────────────────────────────────────────────
function getHost() {
  let host = document.getElementById("sandboxtrace-gmail-banner");
  if (!host) {
    host = document.createElement("div");
    host.id = "sandboxtrace-gmail-banner";
    // Host itself just positions; everything visual lives in Shadow DOM
    Object.assign(host.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "20px",
      right: "24px",
      width: "min(420px, calc(100vw - 48px))",
      maxWidth: "420px",
      fontFamily: "inherit",
    });
    host.attachShadow({ mode: "open" });
    document.body.prepend(host);
  }
  return host;
}

// ── Shared CSS injected once into Shadow DOM ──────────────────────────────
const SHADOW_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:host { display: block; }

.banner {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px 14px;
  border-radius: 14px;
  background: linear-gradient(145deg, #161122 0%, #0e0b14 100%);
  border: 1px solid rgba(200,169,110,0.38);
  box-shadow: 0 24px 60px rgba(0,0,0,0.82), 0 0 0 1px rgba(223,194,141,0.12), 0 0 32px rgba(0,0,0,0.5);
  color: #e8e1d5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12.5px;
  line-height: 1.45;
  animation: slide-in 0.25s cubic-bezier(0.16,1,0.3,1) both;
}

.banner.safe   { border-color: rgba(85,143,112,0.55); box-shadow: 0 24px 60px rgba(0,0,0,0.82), 0 0 24px rgba(85,143,112,0.14); }
.banner.suspicious { border-color: rgba(226,165,84,0.55); box-shadow: 0 24px 60px rgba(0,0,0,0.82), 0 0 24px rgba(226,165,84,0.14); }
.banner.malicious, .banner.error { border-color: rgba(180,56,77,0.6); box-shadow: 0 24px 60px rgba(0,0,0,0.82), 0 0 24px rgba(180,56,77,0.18); }
.banner.scanning { border-color: rgba(200,169,110,0.45); box-shadow: 0 24px 60px rgba(0,0,0,0.82), 0 0 24px rgba(200,169,110,0.13); }

/* Corner glyphs */
.corner { position: absolute; font-family: 'Cinzel', serif; font-size: 8px; color: #c8a96e; opacity: 0.65; pointer-events: none; user-select: none; }
.corner-tl { top: 7px; left: 10px; }
.corner-tr { top: 7px; right: 10px; }

/* Header row */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(200,169,110,0.18);
}

.brand { display: flex; align-items: center; gap: 7px; }

.brand-crest {
  width: 26px; height: 26px;
  border-radius: 7px;
  background: linear-gradient(145deg, #241738, #150f24);
  border: 1px solid rgba(200,169,110,0.45);
  display: flex; align-items: center; justify-content: center;
  color: #dfc28d;
  font-size: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.45);
  flex-shrink: 0;
}

.brand-text { display: flex; flex-direction: column; line-height: 1.2; }

.brand-name {
  font-family: 'Cinzel', serif;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #f5ebd9;
}

.brand-sub {
  font-family: 'Cinzel', serif;
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #c8a96e;
  text-transform: uppercase;
  opacity: 0.85;
}

/* Classification seal */
.seal {
  font-family: 'Cinzel', serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 2px 9px;
  border-radius: 9999px;
  border: 1px solid;
}
.seal.safe       { background: #16271e; border-color: rgba(85,143,112,0.6); color: #a8e6cf; }
.seal.suspicious { background: #2d2011; border-color: rgba(226,165,84,0.6); color: #ffd180; }
.seal.malicious, .seal.error { background: #2c1218; border-color: rgba(180,56,77,0.6); color: #ff8a9a; }
.seal.scanning   { background: #251b33; border-color: rgba(200,169,110,0.4); color: #dfc28d; animation: pulse 1.5s infinite; }

/* Title */
.title {
  font-family: 'Cinzel', serif;
  font-size: 13.5px;
  font-weight: 700;
  color: #f5ebd9;
  letter-spacing: 0.02em;
}

/* Telemetry pills row */
.metrics { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(30,21,45,0.75);
  border: 1px solid rgba(200,169,110,0.22);
  font-size: 11px;
}

.pill-label {
  font-family: 'Cinzel', serif;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #dfc28d;
  letter-spacing: 0.05em;
}

.pill-val {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  color: #f5ebd9;
}

/* Plain message text */
.message { font-size: 12px; color: #c9c0b6; }

/* Divider above actions */
.divider {
  border: none;
  border-top: 1px solid rgba(200,169,110,0.15);
  margin: 0;
}

/* Action buttons row */
.actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Primary link / button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 7px;
  background: linear-gradient(180deg, #dfc28d 0%, #c8a96e 100%);
  border: 1px solid rgba(245,235,217,0.5);
  color: #120d1c !important;
  font-family: 'Cinzel', serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-decoration: none !important;
  box-shadow: 0 3px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.35);
  cursor: pointer;
  transition: all 0.18s ease;
}
.btn-primary:hover {
  background: linear-gradient(180deg, #f5ebd9 0%, #dfc28d 100%);
  box-shadow: 0 5px 16px rgba(200,169,110,0.32);
  transform: translateY(-1px);
}

/* Secondary button */
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 7px;
  background: rgba(28,21,42,0.85);
  border: 1px solid rgba(200,169,110,0.3);
  color: #d5cbbd;
  font-family: 'Cinzel', serif;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.18s ease;
}
.btn-secondary:hover {
  background: rgba(42,31,60,0.95);
  border-color: rgba(200,169,110,0.55);
  color: #f5ebd9;
}

/* Dismiss × button */
.btn-dismiss {
  margin-left: auto;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(200,169,110,0.22);
  color: #9c91ab;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.18s ease;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}
.btn-dismiss:hover {
  background: rgba(200,169,110,0.15);
  border-color: #dfc28d;
  color: #f5ebd9;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}
`;

function renderPanel({ state, title, detail, email, result }) {
  const host = getHost();
  const shadow = host.shadowRoot;

  // Clear previous render but keep the style sheet
  shadow.replaceChildren();

  // Inject CSS once
  const styleEl = document.createElement("style");
  styleEl.textContent = SHADOW_CSS;
  shadow.appendChild(styleEl);

  // Root banner div
  const banner = document.createElement("div");
  banner.className = `banner ${state}`;
  shadow.appendChild(banner);

  // Corner glyphs
  const tl = document.createElement("span");
  tl.className = "corner corner-tl";
  tl.textContent = "❖";
  const tr = document.createElement("span");
  tr.className = "corner corner-tr";
  tr.textContent = "❖";
  banner.append(tl, tr);

  // ── Header ───────────────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "header";

  const brand = document.createElement("div");
  brand.className = "brand";

  const crest = document.createElement("div");
  crest.className = "brand-crest";
  crest.textContent = "❖";

  const brandText = document.createElement("div");
  brandText.className = "brand-text";
  const brandName = document.createElement("span");
  brandName.className = "brand-name";
  brandName.textContent = "ZENTRA";
  const brandSub = document.createElement("span");
  brandSub.className = "brand-sub";
  brandSub.textContent = "Intelligence";
  brandText.append(brandName, brandSub);

  brand.append(crest, brandText);

  const seal = document.createElement("span");
  seal.className = `seal ${state}`;
  if (state === "scanning") {
    seal.textContent = "SCANNING";
  } else {
    seal.textContent = result?.verdict || (state === "safe" ? "BENIGN" : state.toUpperCase());
  }

  header.append(brand, seal);
  banner.appendChild(header);

  // ── Title ─────────────────────────────────────────────────────────────────
  const titleEl = document.createElement("div");
  titleEl.className = "title";
  titleEl.textContent = title;
  banner.appendChild(titleEl);

  // ── Telemetry pills or plain message ─────────────────────────────────────
  if (result && state !== "scanning") {
    const metrics = document.createElement("div");
    metrics.className = "metrics";

    const riskVal = result.riskScore !== undefined && result.riskScore !== null ? result.riskScore : "—";

    const makePill = (label, val) => {
      const p = document.createElement("div");
      p.className = "pill";
      const l = document.createElement("span");
      l.className = "pill-label";
      l.textContent = label;
      const v = document.createElement("span");
      v.className = "pill-val";
      v.textContent = val;
      p.append(l, v);
      return p;
    };

    const geo = result.geoip;
    const geoText = geo?.status === "ok"
      ? `${geo.country || "US"}/${geo.region || geo.city || "Region"}`
      : "—";

    metrics.append(
      makePill("Risk:", `${riskVal}/100`),
      makePill("AI:", result.aiStatus || "ok"),
      makePill("GeoIP:", geoText),
    );
    banner.appendChild(metrics);
  } else {
    const msg = document.createElement("span");
    msg.className = "message";
    msg.textContent = detail;
    banner.appendChild(msg);
  }

  // ── Divider ───────────────────────────────────────────────────────────────
  const hr = document.createElement("hr");
  hr.className = "divider";
  banner.appendChild(hr);

  // ── Action buttons ────────────────────────────────────────────────────────
  const actions = document.createElement("div");
  actions.className = "actions";

  if (result?.analysisId) {
    const link = document.createElement("a");
    link.className = "btn-primary";
    link.textContent = "Open investigation →";
    link.href = `${result.dashboardUrl}/analyses/${result.analysisId}`;
    link.target = "_blank";
    link.rel = "noreferrer";
    actions.append(link);
  }

  if (email && state !== "scanning") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.textContent = "Analyze again";
    btn.addEventListener("click", () => startScan(email, true));
    actions.append(btn);
  }

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "btn-dismiss";
  dismiss.title = "Dismiss";
  dismiss.textContent = "✕";
  dismiss.addEventListener("click", () => host.remove());
  actions.append(dismiss);

  banner.appendChild(actions);
}

function showScanning(email) {
  renderPanel({ state: "scanning", title: "Analyzing email…", detail: "Analyzing email…", email });
}

function showResult(result, email) {
  const status = result?.status || "error";
  const title = status === "malicious" ? "Potentially malicious email"
    : status === "suspicious" ? "Suspicious email detected"
    : status === "safe" ? "Analysis complete"
    : "Analysis failed";
  const geo = result?.geoip;
  const geoText = geo?.status === "ok"
    ? `${geo.country || "Unavailable"}/${geo.region || geo.city || "Unavailable"}`
    : "Unavailable";
  const detail = result?.error || `Verdict: ${result?.verdict || status} · Risk: ${result?.riskScore ?? "—"} · AI: ${result?.aiStatus || "—"} · GeoIP: ${geoText}`;
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
  if (Date.now() - candidateSince >= 800) startScan(data);
}

const observer = new MutationObserver(() => detectMessage());
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", () => { candidateKey = ""; candidateSince = 0; detectMessage(); });
setInterval(detectMessage, 1000);
detectMessage();
