## Phase 1 Implementation
Phase 1 is implemented under `backend/` and is limited to real `.eml` ingestion, MIME parsing, HTML-to-text preprocessing, URL/domain extraction, SHA-256 hashing, configured DistilBERT inference, and PostgreSQL persistence. It does not contact URLs, execute attachments, render webpages, or implement sandbox, VLM, threat-intelligence, GeoIP, TimescaleDB, or Neo4j features.

### Local setup

1. Install Python 3.12 and PostgreSQL, then install dependencies:

   ```powershell
   cd backend
   python -m pip install -r requirements.txt
   ```

2. Create a database named `sandboxtrace` and configure the environment. Copy `.env.example` to `.env` and set `SANDBOXTRACE_MODEL_NAME` to a real Hugging Face DistilBERT sequence-classification model. The verified four-class mapping for `cybersectony/phishing-email-detection-distilbert_v2.4.1` is `legitimate_email`, `phishing_url`, `legitimate_url`, and `phishing_url_alt`. URL probabilities are retained as URL evidence; they are never reported as email-phishing probability. The API refuses to analyze mail when the model setting is empty or the output shape is not the documented four-class model.

3. Run migrations and start the API:

   ```powershell
   cd backend
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

The API is available at `http://localhost:8000`. The OpenAPI document is at `/docs`.

### Docker Compose

Set `SANDBOXTRACE_MODEL_NAME` in the shell, then run:

```powershell
docker compose up --build
```

Compose starts PostgreSQL, applies Alembic migrations, and starts the backend. Model files are downloaded by Transformers from the configured Hugging Face identifier when the first real email is analyzed.

### Phase 1 API

* `POST /api/v1/emails/analyze` with multipart field `file` containing a `.eml` file.
* `GET /api/v1/analyses/{analysis_id}` returns the model label, phishing probability, confidence, and model identifier.
* `GET /api/v1/emails/{email_id}` returns parsed email fields and extracted URLs.
* `GET /health` returns service health.

Run tests from `backend/` with `python -m pytest -q`.

## Phase 2 Implementation

Phase 2 adds a separate `sandbox` container running Playwright and Chromium. The backend can run `POST /api/v1/analyses/{analysis_id}/forensics/{url_id}` for a URL already extracted from a Phase 1 analysis. The sandbox records the final URL, redirect chain, response/network metadata, domains, bounded HTML, screenshot, DOM signals, and JavaScript indicators. It blocks non-HTTP(S) targets and private/local destinations.

The backend persists browser observations, VLM observations, threat-intelligence observations, and the fused verdict in PostgreSQL. Configure `SANDBOXTRACE_VLM_ENDPOINT` for a real screenshot-analysis service and API keys for VirusTotal, URLScan, and AbuseIPDB. Unconfigured providers are recorded as `not_configured`; no provider result is fabricated. Phase 2 does not add GeoIP/ASN correlation, Neo4j, TimescaleDB, campaign tracking, or production deployment.

Start the complete Phase 2 stack with Docker:

```powershell
$env:SANDBOXTRACE_MODEL_NAME="cybersectony/phishing-email-detection-distilbert_v2.4.1"
docker compose up --build
```

After uploading an email and obtaining its `analysis_id` and extracted URL `id`, call the forensic endpoint. Retrieve the persisted result with `GET /api/v1/forensics/{run_id}`. Run backend tests inside Docker with `docker compose exec backend pytest -q`.

## Phase 3 Implementation

Phase 3 adds infrastructure intelligence and reporting on top of each Phase 2 forensic run. TimescaleDB stores timestamped DNS/IP/ASN/ISP/hosting observations, while Neo4j stores campaign and infrastructure relationships when configured. DNS A/AAAA and MX data are collected directly; IPinfo enrichment is used only when `IPINFO_TOKEN` is configured. VPN/Tor/proxy fields are therefore explicitly unavailable when no configured provider supplies them.

The forensic endpoint now performs Phase 3 enrichment after browser evidence, updates the final weighted verdict (`BENIGN`, `SUSPICIOUS`, or `CONFIRMED_MALICIOUS`), and persists a report. Additional APIs are:

* `POST /api/v1/forensics/{run_id}/enrich`
* `GET /api/v1/forensics/{run_id}/report`
* `WS /api/v1/ws/analyses/{analysis_id}` for live status events

Set `SANDBOXTRACE_API_KEY` to protect Phase 3 HTTP enrichment/report endpoints with `X-API-Key` or `Authorization: Bearer`. Leave it unset only for local development. `NEO4J_PASSWORD`, `IPINFO_TOKEN`, and the existing threat-intelligence/VLM settings are optional; unavailable integrations are recorded as `not_configured` or `error` and never replaced with synthetic intelligence.

### Local Ollama VLM

The VLM adapter uses the local Ollama service at `SANDBOXTRACE_OLLAMA_URL` with the configurable vision model `qwen2.5vl:7b`. Ollama receives the actual sandbox PNG as a base64 image together with bounded browser forensic context and returns the JSON evidence stored by the forensic pipeline. If Ollama or the model is unavailable, the provider records `vlm_unavailable`; no VLM finding is fabricated. The live geolocation provider is configurable with `SANDBOXTRACE_GEOIP_PROVIDER=ipinfo` and `IPINFO_TOKEN`.

Run the production overlay with:

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml up --build
```
SandBoxTrace
AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform

SIH Problem Statement: SIH26106
Team: NEXA
Motto: Detect. Trace. Defend.

1. Project Overview

SandBoxTrace is an AI-powered email security and forensic intelligence platform designed to detect phishing, Business Email Compromise (BEC), credential-harvesting attacks, malicious URLs, and dynamically cloaked phishing webpages.

Instead of relying on a single classifier or a reputation database, SandBoxTrace uses a two-tier AI architecture.

Tier 1 — Fast AI Email Detection

A pre-trained DistilBERT model fine-tuned for phishing-email classification analyzes incoming email content and identifies the majority of malicious/benign messages quickly.

Tier 2 — Deep AI Forensic Analysis

Emails that are suspicious or ambiguous are sent to an isolated sandbox.

The sandbox uses a headless browser such as Playwright to render suspicious webpages.

The rendered webpage is analyzed using a Vision-Language Model (VLM), while the browser forensic engine independently analyzes:

DOM
HTML
JavaScript
redirects
forms
network requests
external resources

The results are combined by the Evidence Fusion Engine.

Infrastructure Intelligence

The system extracts:

IP addresses
domains
URLs
mail servers
ASN information
ISP/hosting information
geolocation
VPN/Tor indicators

and compares current infrastructure against historical observations to identify possible relationships between attacks.

This follows the core architecture defined in the SIH proposal.

2. Core Architecture
                         ┌───────────────────────┐
                         │      INCOMING EMAIL    │
                         │                       │
                         │ Gmail / API / Gateway │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │    EMAIL INGESTION     │
                         │      & PARSER          │
                         └───────────┬───────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │                                             │
              ▼                                             ▼
     ┌──────────────────┐                         ┌──────────────────┐
     │  EMAIL CONTENT   │                         │ FORENSIC         │
     │  PREPROCESSOR    │                         │ EXTRACTOR        │
     └────────┬─────────┘                         └────────┬─────────┘
              │                                            │
              ▼                                            ├── URLs
     ┌──────────────────┐                                  ├── Domains
     │   DISTILBERT     │                                  ├── IPs
     │   AI CLASSIFIER  │                                  ├── Headers
     └────────┬─────────┘                                  └── Attachments
              │
              ▼
       ┌───────────────┐
       │ TIER-1 SCORE  │
       └───────┬───────┘
               │
        ┌──────┴──────┐
        │             │
      BENIGN       SUSPICIOUS
        │             │
        ▼             ▼
      REPORT       SANDBOX
                      │
                      ▼
             ┌───────────────────┐
             │ ISOLATED SANDBOX  │
             │                   │
             │ Docker            │
             │ Playwright        │
             │ Chromium          │
             └─────────┬─────────┘
                       │
          ┌────────────┼─────────────┐
          │            │             │
          ▼            ▼             ▼
     Screenshot      DOM/HTML     JS/Network
          │            │             │
          ▼            ▼             ▼
         VLM      Forensic Engine  Network
          │            │             │
          └────────────┼─────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ THREAT           │
              │ INTELLIGENCE     │
              │                  │
              │ VirusTotal       │
              │ URLScan          │
              │ AbuseIPDB        │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ EVIDENCE FUSION  │
              │ ENGINE           │
              └────────┬─────────┘
                       │
                       ▼
          ┌───────────────────────────┐
          │ FINAL THREAT VERDICT      │
          │                           │
          │ BENIGN                    │
          │ SUSPICIOUS                │
          │ CONFIRMED MALICIOUS      │
          └─────────────┬─────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ GEO/ASN ENGINE   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ GEO-MOVEMENT     │
              │ CORRELATION      │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ CAMPAIGN GRAPH   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ FORENSIC REPORT  │
              │ & DASHBOARD      │
              └──────────────────┘

Your proposal describes essentially this same ten-step pipeline from ingestion through dashboarding.

3. AI Architecture
AI Model 1 — DistilBERT
Purpose

DistilBERT is the Tier-1 email intelligence model.

It analyzes the language of an email.

Input
Subject
+
Email body
+
Relevant visible text

Example:

Subject:
URGENT: Your account will be suspended

Body:
We detected unusual activity on your account.
Verify your password immediately to prevent suspension.
Processing
Raw Email
   ↓
HTML Cleaning
   ↓
Text Extraction
   ↓
Normalization
   ↓
Tokenization
   ↓
DistilBERT
   ↓
Classification
Output
{
  "label": "phishing",
  "phishing_probability": 0.94,
  "confidence": 0.91
}
Training strategy

Do not build the transformer from scratch.

Use:

Pre-trained DistilBERT
        ↓
Fine-tune
        ↓
Phishing Email Dataset
        ↓
Evaluation
        ↓
Production Model

Your proposal explicitly specifies pre-trained DistilBERT fine-tuned on the Nazario Phishing Corpus and PhishTank, rather than training from scratch.

4. DistilBERT Training Pipeline
Dataset
   │
   ▼
Data Collection
   │
   ▼
Data Cleaning
   │
   ▼
Duplicate Removal
   │
   ▼
Label Normalization
   │
   ▼
Train / Validation / Test
   │
   ▼
DistilBERT Tokenizer
   │
   ▼
Fine-Tuning
   │
   ▼
Validation
   │
   ▼
Model Evaluation
   │
   ▼
Save Model

Evaluate using:

Accuracy
Precision
Recall
F1-score
False Positive Rate
Confusion Matrix

Your proposal sets a target of F1 ≥ 90% and FPR ≤ 1%. These should be treated as project goals to measure, not as guaranteed model performance.

5. AI Model 2 — Vision-Language Model

The VLM is the Tier-2 visual intelligence component.

It should not replace DistilBERT.

The models have different jobs.

DistilBERT

Understands:

What is the email saying?

VLM

Understands:

What does the rendered webpage look like?

6. VLM Pipeline
Suspicious Email
       │
       ▼
Extract URL
       │
       ▼
Isolated Sandbox
       │
       ▼
Playwright
       │
       ▼
Render Website
       │
       ▼
Take Screenshot
       │
       ▼
VLM
       │
       ▼
Visual Evidence

Example VLM output:

{
  "visual_phishing": true,
  "brand_impersonation": true,
  "login_form": true,
  "credential_harvesting_indicator": true,
  "confidence": 0.93
}

The proposal explicitly defines screenshot → VLM analysis for visual phishing and brand impersonation.

7. Why the VLM is Important

Traditional URL scanning might see:

https://example.com/login

and return:

Unknown

But your system actually renders the page.

It may discover:

Fake Microsoft login
        ↓
Email field
Password field
"Sign in"
        ↓
Credentials sent elsewhere

The VLM provides visual evidence that the page resembles a phishing interface.

This is particularly useful against dynamically generated or visually deceptive phishing pages, which is one of the gaps your proposal identifies.

8. Sandbox Architecture

The sandbox is the bridge between email analysis and webpage analysis.

                 HOST
                   │
          ┌────────▼─────────┐
          │     DOCKER       │
          │    SANDBOX       │
          │                  │
          │ Chromium         │
          │ Playwright       │
          │ Restricted Net   │
          │ Temporary Files  │
          └────────┬─────────┘
                   │
             Suspicious URL
                   │
                   ▼
              WEBPAGE

The sandbox should be:

isolated
temporary
network restricted
disposable
monitored
destroyed after analysis

Your proposal calls for an ephemeral, network-restricted container using Playwright.

9. Browser Forensic Engine

While the VLM analyzes the screenshot, another engine analyzes technical browser evidence.

DOM

Look for:

<input type="password">
<form>
iframe
hidden elements
external forms
suspicious scripts
JavaScript

Analyze:

Redirect scripts
Obfuscated code indicators
External script sources
Form handlers
Dynamic navigation
Network

Record:

Initial URL
Redirect chain
Requests
Domains
IPs
External resources
Destination hosts
Result
{
  "password_field": true,
  "external_form_action": true,
  "redirect_count": 4,
  "suspicious_script": true,
  "external_domains": 6
}

Your proposal specifically separates DOM/JS/network analysis from screenshot/VLM analysis before fusion.

10. Evidence Fusion Engine

This is one of the most important custom components of SandBoxTrace.

Instead of trusting one model:

DistilBERT → malicious

you combine independent evidence.

                  DistilBERT
                     │
                     ▼
                 AI Score
                     │
                     │
VLM ────────────────►│
Visual Evidence      │
                     │
DOM/JS ─────────────►│
                     │
Network ────────────►│
                     │
Headers ────────────►│
                     │
Threat Intel ───────►│
                     ▼
             EVIDENCE FUSION
                     │
                     ▼
                RISK SCORE
                     │
                     ▼
                 VERDICT
11. Example Evidence Fusion

Suppose:

DistilBERT phishing probability     94%
VLM visual phishing confidence     93%
Password field                      YES
External form destination           YES
Redirects                           4
DMARC                               FAIL
Threat intelligence                 Suspicious

The fusion engine could produce:

Risk Score: 97/100

Verdict:
CONFIRMED MALICIOUS

Then provide:

Reasons:

✓ Phishing language detected
✓ Fake login interface detected
✓ Credential field detected
✓ Suspicious external form
✓ Multiple redirects
✓ Email authentication anomaly
✓ Suspicious infrastructure

This is what makes the output explainable.

12. Three Verdict Levels

Use:

BENIGN

Low-risk evidence.

SUSPICIOUS

Evidence is incomplete or conflicting.

CONFIRMED MALICIOUS

Multiple independent signals strongly indicate malicious activity.

This matches the three-way verdict structure in your proposal.

13. VirusTotal and URLScan

These should not be your AI models.

They are external threat-intelligence/detonation sources.

Architecture:

             Extract URL/IP/domain
                     │
              ┌──────┴──────┐
              │             │
         VirusTotal      URLScan
              │             │
              └──────┬──────┘
                     │
                     ▼
             External Evidence
                     │
                     ▼
              Evidence Fusion

This means:

DistilBERT + VLM = your main AI layer

while:

VirusTotal/URLScan = supporting intelligence

Your proposal specifically places these services in the deep-analysis tier rather than defining them as your AI model.

14. Geo/ASN Intelligence

After extracting infrastructure:

URL
 ↓
Domain
 ↓
IP
 ↓
ASN
 ↓
ISP
 ↓
Hosting
 ↓
Country

Example:

IP:
185.xxx.xxx.xxx

Country:
Netherlands

ASN:
ASxxxxx

ISP:
Example Hosting

Tor:
Possible

The important distinction is:

Geolocation of an IP does not necessarily identify the attacker's physical location.

Your report should say observed infrastructure location, not:

"The attacker is located in Netherlands."

Your proposal explicitly requires separating observed infrastructure from unknown physical location.

15. Geo-Movement Tracker

This is your major differentiator.

Suppose a campaign changes:

Day 1
IP A
Germany
ASN A

       ↓

Day 3
IP B
Netherlands
ASN B

       ↓

Day 7
IP C
Singapore
ASN C

A simple IP blocklist sees three unrelated IPs.

SandBoxTrace looks for relationships:

Same domain
+
Similar webpage
+
Similar DOM
+
Similar infrastructure
+
Related ASN/hosting patterns

and generates:

Possible campaign relationship: 87%

The proposal identifies this infrastructure correlation as its core differentiator.

16. Campaign Graph

Use Neo4j for the graph layer.

Conceptually:

              CAMPAIGN
                  │
       ┌──────────┼───────────┐
       │          │           │
     DOMAIN       IP         URL
       │          │           │
       │         ASN          │
       │          │           │
       └──── HOSTING ─────────┘

Example:

Campaign-001
    │
    ├── Domain-A
    │      ├── IP-1
    │      └── IP-2
    │
    ├── Domain-B
    │      └── IP-3
    │
    └── Shared DOM Template

This can reveal relationships that aren't obvious from a single email.

17. Database Architecture

Your proposal specifies PostgreSQL + TimescaleDB and Neo4j.

PostgreSQL

Store:

emails
analyses
URLs
domains
IPs
headers
AI predictions
VLM results
forensic evidence
threat intelligence
verdicts
campaigns
TimescaleDB

Use for historical infrastructure observations:

IP observed at time T1
IP changed at T2
ASN changed at T3
Domain observed at T4
Neo4j

Use for relationships:

IP → ASN
IP → Domain
Domain → Campaign
URL → Campaign
Campaign → Infrastructure
18. Backend Architecture

Use:

Python
FastAPI
REST API
WebSocket

as defined in your proposal.

Suggested backend:

backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── email.py
│   │   ├── analysis.py
│   │   ├── sandbox.py
│   │   ├── intelligence.py
│   │   ├── campaigns.py
│   │   └── websocket.py
│   │
│   ├── models/
│   │   ├── email.py
│   │   ├── analysis.py
│   │   ├── evidence.py
│   │   └── campaign.py
│   │
│   ├── services/
│   │   ├── email_parser.py
│   │   ├── distilbert_service.py
│   │   ├── sandbox_service.py
│   │   ├── playwright_service.py
│   │   ├── vlm_service.py
│   │   ├── forensic_service.py
│   │   ├── threat_intel_service.py
│   │   ├── fusion_service.py
│   │   ├── geo_service.py
│   │   └── campaign_service.py
│   │
│   ├── database/
│   │   ├── postgres.py
│   │   ├── timescale.py
│   │   └── neo4j.py
│   │
│   └── schemas/
│       ├── email.py
│       ├── analysis.py
│       └── verdict.py
│
└── tests/
19. AI Model Directory

Keep the ML work separate:

ml/
│
├── distilbert/
│   ├── dataset/
│   ├── preprocessing/
│   ├── training/
│   ├── evaluation/
│   ├── inference/
│   └── saved_model/
│
└── vlm/
    ├── prompts/
    ├── inference/
    ├── evaluation/
    └── schemas/
20. Frontend Architecture

Your proposal uses:

React
TypeScript
Tailwind CSS
D3.js

Suggested:

frontend/
│
├── src/
│   ├── components/
│   │   ├── EmailCard.tsx
│   │   ├── RiskScore.tsx
│   │   ├── EvidencePanel.tsx
│   │   ├── VLMResult.tsx
│   │   ├── ForensicTimeline.tsx
│   │   ├── GeoMap.tsx
│   │   └── CampaignGraph.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Investigation.tsx
│   │   ├── Campaigns.tsx
│   │   └── Reports.tsx
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   └── App.tsx
21. Dashboard

The analyst should see:

┌──────────────────────────────────────────┐
│             SandBoxTrace                 │
├──────────────────────────────────────────┤
│ Verdict: CONFIRMED MALICIOUS             │
│ Risk Score: 97 / 100                     │
├──────────────────────────────────────────┤
│ AI ANALYSIS                              │
│ DistilBERT: 94%                          │
│ VLM:       93%                           │
├──────────────────────────────────────────┤
│ FORENSIC EVIDENCE                        │
│ ✓ Fake login page                        │
│ ✓ Credential harvesting                  │
│ ✓ 4 redirects                            │
│ ✓ Suspicious JavaScript                  │
│ ✓ External form submission               │
├──────────────────────────────────────────┤
│ INFRASTRUCTURE                           │
│ IP → ASN → ISP → Country                 │
├──────────────────────────────────────────┤
│ CAMPAIGN RELATION                        │
│ Confidence: 87%                          │
├──────────────────────────────────────────┤
│ [View Screenshot] [View DOM] [Report]    │
└──────────────────────────────────────────┘
22. REST API

Example endpoints:

POST /api/v1/emails/analyze

Analyze an email.

GET /api/v1/analysis/{analysis_id}

Retrieve analysis.

GET /api/v1/evidence/{analysis_id}

Retrieve evidence.

GET /api/v1/campaigns

Retrieve campaigns.

GET /api/v1/campaigns/{campaign_id}

Retrieve campaign infrastructure.

GET /api/v1/infrastructure/{ip}

Retrieve IP intelligence.

GET /api/v1/reports/{analysis_id}

Generate forensic report.

23. End-to-End Example

Imagine an employee receives:

From:
security@microsoft-support-example.com

Subject:
URGENT: Verify your Microsoft account
Step 1 — Email ingestion

System receives email.

Step 2 — Preprocessing

Extract:

Subject
Body
URLs
Headers
Sender
Step 3 — DistilBERT
Phishing probability: 0.94

System considers the email suspicious.

Step 4 — Sandbox

URL is opened in isolated environment.

Step 5 — Playwright

Page renders.

The browser records:

4 redirects
Password input
External form
Suspicious JavaScript
Step 6 — Screenshot

Screenshot is sent to VLM.

Step 7 — VLM
Fake login page: YES
Brand impersonation: YES
Credential harvesting: YES
Confidence: 0.93
Step 8 — Threat intelligence

External intelligence may provide additional URL/IP/domain evidence.

Step 9 — Evidence Fusion
DistilBERT       94%
VLM              93%
DOM/JS           HIGH
Network          HIGH
Authentication  FAIL
Threat Intel     HIGH
Step 10 — Final verdict
CONFIRMED MALICIOUS
Risk: 97/100
Step 11 — Infrastructure
Domain → IP → ASN → ISP → Country
Step 12 — Historical correlation

System discovers that related infrastructure was previously associated with another phishing campaign.

Step 13 — Report

The analyst receives:

Threat:
Credential Phishing

Risk:
97/100

AI Evidence:
DistilBERT + VLM

Browser Evidence:
DOM + JS + Network

Infrastructure:
IP + ASN + Geo

Campaign:
Possible relationship = 87%

Verdict:
CONFIRMED MALICIOUS
24. What Makes SandBoxTrace Different?

Your project should emphasize three innovations.

Innovation 1 — Two-Tier Cost-Aware AI

Don't run expensive deep analysis on every email.

             ALL EMAILS
                 │
                 ▼
             DistilBERT
                 │
        ┌────────┴────────┐
        │                 │
      BENIGN          SUSPICIOUS
        │                 │
       END             VLM +
                       Sandbox

Your proposal targets Tier 1 handling approximately 85% of traffic, leaving a smaller fraction for deeper analysis.

Innovation 2 — Multimodal Evidence Fusion

Instead of trusting:

URL reputation

you combine:

Email language
+
Screenshot
+
DOM
+
JavaScript
+
Network
+
Headers
+
Threat intelligence

The proposal identifies this as its second novelty.

Innovation 3 — Infrastructure Movement

Instead of asking only:

"Is this IP malicious?"

you ask:

"Is this infrastructure connected to a previously observed campaign even though the attacker changed IPs, ASNs, hosting, VPNs or Tor nodes?"

This is the core differentiator in your proposal.

25. What Each Technology Does
Technology	Role
DistilBERT	AI email/phishing classification
VLM	AI visual webpage analysis
Playwright	Browser automation/rendering
Docker	Sandbox isolation
DOM analyzer	HTML/page structure analysis
JS analyzer	JavaScript behavior analysis
Network analyzer	Redirect/request analysis
VirusTotal	External threat intelligence
URLScan	URL/webpage intelligence
GeoIP	IP geolocation
ASN lookup	Network ownership/infrastructure
Neo4j	Campaign/infrastructure graph
PostgreSQL	Main database
TimescaleDB	Historical/time-series infrastructure data
FastAPI	Backend API
React	Dashboard
D3.js	Geo/campaign visualization
SHAP	DistilBERT explainability

The technology choices above are grounded in the stack specified by your proposal.

26. Recommended Project Folder

For the actual ChatGPT Project, I recommend organizing your development around this:

SandBoxTrace/
│
├── README.md
├── PROJECT_SPEC.md
├── ARCHITECTURE.md
├── API_SPEC.md
├── DATABASE_SCHEMA.md
├── SECURITY.md
├── TESTING.md
├── DEPLOYMENT.md
│
├── backend/
│
├── frontend/
│
├── ml/
│   ├── distilbert/
│   └── vlm/
│
├── sandbox/
│   ├── docker/
│   └── playwright/
│
├── intelligence/
│   ├── threat_intel/
│   ├── geoip/
│   ├── asn/
│   └── campaign_correlation/
│
├── database/
│   ├── postgres/
│   ├── timescale/
│   └── neo4j/
│
├── datasets/
│   ├── nazario/
│   └── phishtank/
│
├── tests/
│
├── docs/
│
└── deployment/
    ├── docker/
    └── cloud/
27. Development Order

Don't build the entire system at once.

Phase 1

DistilBERT

Dataset
→ preprocessing
→ fine-tuning
→ evaluation
→ inference API
Phase 2

Email forensic extraction

Email
→ headers
→ URLs
→ domains
→ IPs
Phase 3

Sandbox

URL
→ Docker
→ Playwright
→ screenshot
→ DOM
→ JS
→ network
Phase 4

VLM

Screenshot
→ VLM
→ structured visual evidence
Phase 5

Evidence Fusion

DistilBERT
+
VLM
+
DOM
+
JS
+
Network
+
Headers
+
Threat intelligence
Phase 6

Geo/ASN

IP
→ GeoIP
→ ASN
→ ISP
→ hosting
Phase 7

Campaign correlation

Current infrastructure
+
Historical infrastructure
→
Campaign relationship
Phase 8

Dashboard

FastAPI
↕
React
↕
Database
Phase 9

Testing + deployment

Your proposal assigns testing, benchmarking and deployment responsibilities including synthetic campaign injection and benchmarking.

28. What We Should NOT Claim

This is very important for your SIH presentation.

Do not claim:

❌ "VirusTotal is our AI."

❌ "VLM alone detects every phishing attack."

❌ "GeoIP tells us the attacker's physical location."

❌ "Our AI is always correct."

❌ "The system automatically fixes compromised systems."

❌ "We can decode every Packet Tracer/attachment format."

❌ "We have perfect attribution."

Instead say:

✅ "VirusTotal and URLScan provide external threat intelligence."

✅ "VLM provides visual evidence."

✅ "GeoIP identifies observed infrastructure location."

✅ "The fusion engine combines independent evidence."

✅ "Attribution is confidence-scored."

✅ "The system provides analyst-supporting intelligence."

This keeps the claims aligned with what your proposal actually describes.

29. Final Project Definition

The simplest way to explain SandBoxTrace to a judge is:

SandBoxTrace is an AI-powered email threat detection and forensic intelligence platform that combines a fine-tuned DistilBERT model for fast email analysis with a Vision-Language Model for visual analysis of dynamically rendered webpages. Suspicious emails are analyzed inside an isolated sandbox using browser-level DOM, JavaScript and network telemetry. These independent signals are combined by our Evidence Fusion Engine to generate an explainable threat verdict. The system then extracts and enriches IP, domain and ASN information and correlates infrastructure changes across historical campaigns using a Geo-Movement Tracker.

That is the core definition we should keep consistent across your code, README, presentation, demo, report, and judge explanation. Your proposal's stated outcome is similarly an AI intelligence layer that integrates with existing email-security/SIEM infrastructure and produces evidence-backed reports rather than merely returning an opaque malicious flag.

Most important architecture decision

Your final AI stack should be:

              ┌──────────────────┐
              │    DistilBERT    │
              │  Email Language  │
              │      AI          │
              └────────┬─────────┘
                       │
                       │
              ┌────────▼─────────┐
              │    Sandbox +     │
              │    Playwright    │
              └────────┬─────────┘
                       │
              ┌────────┴─────────┐
              │                  │
       ┌──────▼──────┐    ┌──────▼──────┐
       │     VLM     │    │ DOM/JS/NET  │
       │ Visual AI   │    │  Forensics  │
       └──────┬──────┘    └──────┬──────┘
              │                  │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ Evidence Fusion  │
              │     Engine       │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Final Verdict    │
              └────────┬─────────┘
                       │
             ┌─────────▼─────────┐
             │ Geo + ASN +       │
             │ Campaign Graph   │
             └───────────────────┘
