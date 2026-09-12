# SandBoxTrace for Gmail

Load this directory with **chrome://extensions** → **Developer mode** → **Load unpacked**.

The extension watches opened Gmail messages, extracts the sender, subject, visible body, and HTTP(S) links, and builds an RFC 822 `.eml` file solely to use the existing `POST /api/v1/emails/analyze` contract. If the backend extracts a URL, it starts one existing forensic run with `POST /api/v1/analyses/{analysis_id}/forensics/{url_id}`. It does not classify, render, or enrich email data itself.

Set the backend and dashboard URLs in the extension settings. Add the displayed Chrome extension ID to `SANDBOXTRACE_CORS_ORIGINS`, then restart the backend. For the local defaults, the setting is:

`SANDBOXTRACE_CORS_ORIGINS=http://localhost:3000,chrome-extension://YOUR_EXTENSION_ID`

The extension uses only Gmail content-script access, storage, and a user-approved optional host permission for a custom backend URL. It avoids duplicate scans during a browser session and reports timeouts, API errors, unsupported Gmail views, and emails without URLs without fabricating a verdict.
