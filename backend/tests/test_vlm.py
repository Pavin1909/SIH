import asyncio

import httpx

from app.core.config import Settings
from app.services.vlm_client import VLMClient


def test_ollama_response_is_normalized_to_fusion_evidence() -> None:
    parsed = VLMClient._parse_response({"message": {"content": '{"visual_phishing": true, "brand_impersonation": true, "login_form": true, "credential_harvesting_indicator": false, "confidence": 0.87}'}}, "qwen2.5vl:7b")
    assert parsed["visual_phishing"] is True
    assert parsed["brand_impersonation"] is True
    assert parsed["login_form"] is True
    assert parsed["confidence"] == 0.87
    assert parsed["provider"] == "ollama"


def test_ollama_unavailable_does_not_generate_vlm_evidence() -> None:
    result = asyncio.run(VLMClient(Settings(vlm_provider="ollama", ollama_url="http://127.0.0.1:1")).analyze("not-a-real-image"))
    assert result.status == "vlm_unavailable"
    assert result.response["provider"] == "ollama"


def test_ollama_request_contains_actual_png_and_context(monkeypatch) -> None:
    captured = {}

    class MockClient:
        def __init__(self, **kwargs):
            captured["timeout"] = kwargs["timeout"]

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, endpoint, json, **kwargs):
            captured.update(endpoint=endpoint, payload=json)
            return httpx.Response(200, json={"message": {"content": '{"confidence": 0.5}'}} , request=httpx.Request("POST", endpoint))

    monkeypatch.setattr("app.services.vlm_client.httpx.AsyncClient", MockClient)
    settings = Settings(vlm_provider="ollama", ollama_url="http://ollama:11434", vlm_model="qwen2.5vl:7b")
    result = asyncio.run(VLMClient(settings).analyze("data:image/png;base64,abc", {"final_url": "https://example.com"}))
    assert result.status == "ok"
    assert captured["endpoint"] == "http://ollama:11434/api/chat"
    assert captured["payload"]["model"] == "qwen2.5vl:7b"
    message = captured["payload"]["messages"][0]
    assert message["images"] == ["abc"]
    assert "example.com" in message["content"]
