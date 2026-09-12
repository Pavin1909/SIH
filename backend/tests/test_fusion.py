from app.services.fusion import fuse_evidence


def test_fusion_combines_browser_and_email_signals() -> None:
    result = fuse_evidence(
        0.8,
        {
            "redirect_chain": ["https://example.test", "https://login.example.test"],
            "dom_signals": {"password_fields": 1, "external_form_actions": 1},
            "javascript_signals": {"obfuscation_tokens": 2},
        },
        {"status": "not_configured", "response": {}},
        [{"provider": "virustotal", "status": "not_configured", "response": {}}],
    )
    assert result.verdict == "CONFIRMED_MALICIOUS"
    assert result.risk_score == 85
    assert "password_field_present" in result.evidence["signals"]


def test_fusion_does_not_invent_unavailable_provider_evidence() -> None:
    result = fuse_evidence(0.01, {}, {"status": "not_configured", "response": {}}, [])
    assert result.verdict == "BENIGN"
    assert result.evidence["providers"] == []
