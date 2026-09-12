const defaults = { backendUrl: "http://localhost:8000", dashboardUrl: "http://localhost:3000" };
const backend = document.getElementById("backendUrl"); const dashboard = document.getElementById("dashboardUrl"); const message = document.getElementById("message");
chrome.storage.sync.get(defaults).then((value) => { backend.value = value.backendUrl; dashboard.value = value.dashboardUrl; });
document.getElementById("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const backendUrl = new URL(backend.value).origin; const dashboardUrl = new URL(dashboard.value).origin;
    const pattern = `${new URL(backendUrl).protocol}//${new URL(backendUrl).host}/*`;
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) throw new Error("Permission for the backend origin was not granted.");
    await chrome.storage.sync.set({ backendUrl, dashboardUrl }); message.textContent = "Settings saved.";
  } catch (error) { message.textContent = error.message || "Invalid URL."; }
});
