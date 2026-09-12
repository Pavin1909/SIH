from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class URLResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    domain: str


class EmailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sha256: str
    sender: str | None
    recipients: list[str]
    subject: str | None
    headers: dict[str, str | list[str]]
    text_body: str
    html_body: str | None
    raw_size: int
    created_at: datetime
    urls: list[URLResponse]
