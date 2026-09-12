from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BrowserObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    initial_url: str
    final_url: str | None
    redirect_chain: list[str]
    requests: list[dict]
    domains: list[str]
    html: str
    screenshot_available: bool
    dom_signals: dict
    javascript_signals: dict


class ProviderObservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str
    status: str
    response: dict


class ForensicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    analysis_id: UUID
    email_url_id: UUID
    url: str
    status: str
    verdict: str
    risk_score: float = Field(ge=0, le=100)
    fused_evidence: dict
    browser_observation: BrowserObservationResponse | None
    provider_observations: list[ProviderObservationResponse]
    created_at: datetime


class ReportResponse(BaseModel):
    run_id: UUID
    report_json: dict
    report_markdown: str
