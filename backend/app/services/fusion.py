from dataclasses import dataclass


@dataclass(frozen=True)
class FusionResult:
    verdict: str
    risk_score: float
    evidence: dict


def fuse_evidence(email_probability: float | None, browser: dict, vlm: dict, providers: list[dict], url_probability: float | None = None) -> FusionResult:
    dom = browser.get("dom_signals", {})
    js = browser.get("javascript_signals", {})
    signals: list[str] = []
    score = max(0.0, min(100.0, (email_probability or 0.0) * 60.0))
    if email_probability is not None and email_probability >= 0.5:
        signals.append("email_model_phishing_probability_high")
    if url_probability is not None:
        signals.append("url_model_probability_available")
    if dom.get("password_fields", 0):
        score += 15
        signals.append("password_field_present")
    if dom.get("external_form_actions", 0):
        score += 15
        signals.append("external_form_action")
    if js.get("obfuscation_tokens", 0):
        score += min(10, js["obfuscation_tokens"] * 2)
        signals.append("obfuscated_javascript_tokens")
    if len(browser.get("redirect_chain", [])) > 1:
        score += min(10, (len(browser["redirect_chain"]) - 1) * 3)
        signals.append("redirect_observed")
    if vlm.get("status") == "ok":
        response = vlm.get("response", {})
        if response.get("visual_phishing") is True or response.get("credential_harvesting_indicator") is True:
            score += 20
            signals.append("vlm_visual_phishing_indicator")
    for provider in providers:
        if provider.get("status") == "ok":
            signals.append(f"{provider.get('provider')}_evidence_available")
    score = min(100.0, round(score, 4))
    verdict = "CONFIRMED_MALICIOUS" if score >= 75 else "SUSPICIOUS" if score >= 35 else "BENIGN"
    return FusionResult(verdict, score, {"signals": signals, "email_probability": email_probability, "url_phishing_probability": url_probability, "browser": browser, "vlm": vlm, "providers": providers})
