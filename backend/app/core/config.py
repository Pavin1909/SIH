from functools import lru_cache
import os

from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "SandBoxTrace API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://sandboxtrace:sandboxtrace@postgres:5432/sandboxtrace"
    model_name: str = Field(default="", description="Hugging Face model identifier or local path")
    model_revision: str | None = None
    max_email_size_bytes: int = 10 * 1024 * 1024
    log_level: str = "INFO"
    sandbox_url: str = "http://sandbox:8080"
    sandbox_timeout_seconds: float = 45.0
    vlm_provider: str = "ollama"
    vlm_model: str = "qwen2.5vl:7b"
    ollama_url: str = "http://ollama:11434"
    vlm_timeout_seconds: float = 45.0
    cors_origins: tuple[str, ...] = ("http://localhost:3000",)
    threat_intel_timeout_seconds: float = 20.0
    virustotal_api_key: str | None = None
    urlscan_api_key: str | None = None
    abuseipdb_api_key: str | None = None
    ipinfo_token: str | None = None
    geoip_provider: str = "ipinfo"
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str | None = None
    phase3_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("SANDBOXTRACE_APP_NAME", "SandBoxTrace API"),
        environment=os.getenv("SANDBOXTRACE_ENVIRONMENT", "development"),
        database_url=os.getenv("SANDBOXTRACE_DATABASE_URL", "postgresql+psycopg://sandboxtrace:sandboxtrace@postgres:5432/sandboxtrace"),
        model_name=os.getenv("SANDBOXTRACE_MODEL_NAME", ""),
        model_revision=os.getenv("SANDBOXTRACE_MODEL_REVISION") or None,
        max_email_size_bytes=int(os.getenv("SANDBOXTRACE_MAX_EMAIL_SIZE_BYTES", str(10 * 1024 * 1024))),
        log_level=os.getenv("SANDBOXTRACE_LOG_LEVEL", "INFO"),
        sandbox_url=os.getenv("SANDBOXTRACE_SANDBOX_URL", "http://sandbox:8080"),
        sandbox_timeout_seconds=float(os.getenv("SANDBOXTRACE_SANDBOX_TIMEOUT_SECONDS", "45")),
        vlm_provider=os.getenv("SANDBOXTRACE_VLM_PROVIDER", "ollama").strip().lower(),
        vlm_model=os.getenv("SANDBOXTRACE_VLM_MODEL", "qwen2.5vl:7b"),
        ollama_url=os.getenv("SANDBOXTRACE_OLLAMA_URL", "http://ollama:11434").rstrip("/"),
        vlm_timeout_seconds=float(os.getenv("SANDBOXTRACE_VLM_TIMEOUT_SECONDS", "45")),
        cors_origins=tuple(origin.strip().rstrip("/") for origin in os.getenv("SANDBOXTRACE_CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()),
        threat_intel_timeout_seconds=float(os.getenv("SANDBOXTRACE_THREAT_INTEL_TIMEOUT_SECONDS", "20")),
        virustotal_api_key=os.getenv("VIRUSTOTAL_API_KEY") or os.getenv("SANDBOXTRACE_VIRUSTOTAL_API_KEY") or None,
        urlscan_api_key=os.getenv("URLSCAN_API_KEY") or os.getenv("SANDBOXTRACE_URLSCAN_API_KEY") or None,
        abuseipdb_api_key=os.getenv("ABUSEIPDB_API_KEY") or os.getenv("SANDBOXTRACE_ABUSEIPDB_API_KEY") or None,
        ipinfo_token=os.getenv("IPINFO_TOKEN") or None,
        geoip_provider=os.getenv("SANDBOXTRACE_GEOIP_PROVIDER", "ipinfo").strip().lower(),
        neo4j_uri=os.getenv("NEO4J_URI", "bolt://neo4j:7687"),
        neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
        neo4j_password=os.getenv("NEO4J_PASSWORD") or None,
        phase3_api_key=os.getenv("SANDBOXTRACE_API_KEY") or None,
    )
