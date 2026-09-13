from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.email import EmailResponse
from app.schemas.forensics import ForensicResponse



class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email_id: UUID
    model_name: str
    label: str
    phishing_probability: float | None = Field(default=None, ge=0, le=1)
    email_phishing_probability: float | None = Field(default=None, ge=0, le=1)
    url_phishing_probability: float = Field(ge=0, le=1)
    class_probabilities: dict[str, float]
    confidence: float = Field(ge=0, le=1)
    created_at: datetime


class AnalysisWithEmailResponse(AnalysisResponse):
    email: EmailResponse


class LatestInvestigationResponse(BaseModel):
    analysis: AnalysisWithEmailResponse | None = None
    forensic: ForensicResponse | None = None
