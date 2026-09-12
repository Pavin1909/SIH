let lastKey = "";
let scanTimer;

function text(selector) { return document.querySelector(selector)?.textContent?.trim() || ""; }
function emailData() {
  const body = document.querySelector("div[role='main'] div.a3s.aiL") || document.querySelector("div[role='main'] div[dir='ltr']");
  if (!body?.textContent?.trim()) return null;
  const sender = document.querySelector("span[email], h2[email]")?.getAttribute("email") || text("span[email], h2[email]");
  const subject = text("h2.hP") || text("div[role='main'] h2");
  const bodyText = body.textContent.trim();
  const urls = [...new Set([...body.querySelectorAll("a[href]")].map((link) => link.href).filter((url) => /^https?:/i.test(url)))];
  const messageKey = `${location.href}|${sender}|${subject}|${bodyText.slice(0, 512)}`;
  return { sender, subject, body: bodyText, urls, messageKey };
}
function banner(result) {
  const id = "sandboxtrace-gmail-banner"; document.getElementById(id)?.remove();
  if (!result || result.status === "safe") return;
  const node = document.createElement("div"); node.id = id; node.className = `sandboxtrace-banner sandboxtrace-${result.status}`;
  const title = result.status === "malicious" ? "Potentially malicious email" : result.status === "suspicious" ? "Suspicious email" : "SandBoxTrace scan issue";
  node.innerHTML = `<strong>${title}</strong><span>${result.error || result.verdict || "Review the investigation before interacting with links or attachments."}</span>`;
  if (result.analysisId) { const link = document.createElement("a"); link.textContent = "Open investigation"; link.href = `${result.dashboardUrl}/analyses/${result.analysisId}`; link.target = "_blank"; link.rel = "noreferrer"; node.append(link); }
  document.body.prepend(node);
}
function renderScanning() { const old = document.getElementById("sandboxtrace-gmail-banner"); old?.remove(); const node = document.createElement("div"); node.id = "sandboxtrace-gmail-banner"; node.className = "sandboxtrace-banner sandboxtrace-scanning"; node.textContent = "SandBoxTrace: scanning this email…"; document.body.prepend(node); }
function scheduleScan() {
  clearTimeout(scanTimer); scanTimer = setTimeout(() => { const data = emailData(); if (!data || data.messageKey === lastKey) return; lastKey = data.messageKey; renderScanning(); chrome.runtime.sendMessage({ type: "SCAN_GMAIL_EMAIL", email: data }, banner); }, 700);
}
new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("hashchange", scheduleScan); scheduleScan();
