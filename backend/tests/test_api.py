import os

os.environ.setdefault("SANDBOXTRACE_DATABASE_URL", "sqlite:///./test.db")

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.services.classifier import DistilBertClassifier, ModelNotConfiguredError

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_classifier_requires_real_model_configuration() -> None:
    try:
        DistilBertClassifier(Settings(model_name=""))
    except ModelNotConfiguredError as exc:
        assert "SANDBOXTRACE_MODEL_NAME" in str(exc)
    else:
        raise AssertionError("An empty model name must fail clearly")


def test_analyze_rejects_non_eml_upload() -> None:
    response = client.post(
        "/api/v1/emails/analyze",
        files={"file": ("message.txt", b"From: sender@example.com\n\nHello", "text/plain")},
    )
    assert response.status_code == 415


def test_cors_allows_the_configured_frontend_origin_only() -> None:
    response = client.options(
        "/api/v1/emails/analyze",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_allows_chrome_extension_origin() -> None:
    origin = "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    response = client.options(
        "/api/v1/emails/analyze",
        headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
