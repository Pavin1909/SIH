import asyncio

from app.services.correlation import campaign_key
from app.services.phase3_service import final_verdict
from app.services.reporting import build_report
from app.services.classifier import DistilBertClassifier


def test_final_verdict_weights_infrastructure_indicators() -> None:
    verdict, score = final_verdict(70, [{"vpn": True, "tor": False, "proxy": False}], ["shared_domain"])
    assert verdict == "CONFIRMED_MALICIOUS"
    assert score == 80


def test_campaign_key_is_deterministic_for_observed_indicators() -> None:
    observations = [{"domain": "example.com", "ip": "203.0.113.10"}]
    assert campaign_key(observations) == campaign_key(list(reversed(observations)))


def test_report_contains_limitations_without_inventing_provider_data() -> None:
    class Run:
        id = "run-id"
        url = "https://example.com"
        verdict = "BENIGN"
        risk_score = 1.0
        fused_evidence = {"signals": [], "providers": []}

    report, markdown = build_report(Run(), [], [], "not_configured")
    assert report["campaign_graph"]["status"] == "not_configured"
    assert report["limitations"]
    assert "No related historical observation" in markdown


def test_model_class_mapping_keeps_url_classes_out_of_email_probability() -> None:
    assert DistilBertClassifier.SEMANTIC_LABELS == {
        0: "legitimate_email",
        1: "phishing_url",
        2: "legitimate_url",
        3: "phishing_url_alt",
    }


def test_live_geoip_without_provider_is_graceful() -> None:
    from app.core.config import Settings
    from app.services.infrastructure import InfrastructureEnricher

    enricher = InfrastructureEnricher(Settings(ipinfo_token=None))
    result = asyncio.run(enricher._geoip("8.8.8.8"))
    assert result["geoip_status"] == "geoip_unavailable"
    assert "latitude" not in result
