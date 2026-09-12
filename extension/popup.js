const title = document.getElementById("status"); const detail = document.getElementById("detail"); const link = document.getElementById("investigation");
chrome.storage.local.get("lastResult").then(({ lastResult }) => {
  if (!lastResult) return;
  title.textContent = lastResult.status === "safe" ? "Safe" : lastResult.status === "suspicious" ? "Suspicious" : lastResult.status === "malicious" ? "Malicious" : "Scan issue";
  detail.textContent = lastResult.error || lastResult.verdict || `Phishing probability: ${Math.round((lastResult.phishingProbability || 0) * 100)}%`;
  if (lastResult.analysisId) { link.hidden = false; link.href = `${lastResult.dashboardUrl}/analyses/${lastResult.analysisId}`; }
});
document.getElementById("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
