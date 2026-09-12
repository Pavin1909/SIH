from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class ForensicRun(Base):
    __tablename__ = "forensic_runs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    analysis_id: Mapped[UUID] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    email_url_id: Mapped[UUID] = mapped_column(ForeignKey("email_urls.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="completed")
    verdict: Mapped[str] = mapped_column(String(64))
    risk_score: Mapped[float] = mapped_column()
    fused_evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    analysis: Mapped["Analysis"] = relationship(back_populates="forensic_runs")
    email_url: Mapped["EmailURL"] = relationship()
    browser_observation: Mapped["BrowserObservation | None"] = relationship(back_populates="forensic_run", uselist=False, cascade="all, delete-orphan")
    provider_observations: Mapped[list["ProviderObservation"]] = relationship(back_populates="forensic_run", cascade="all, delete-orphan")


class BrowserObservation(Base):
    __tablename__ = "browser_observations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    forensic_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), unique=True)
    initial_url: Mapped[str] = mapped_column(Text)
    final_url: Mapped[str | None] = mapped_column(Text)
    redirect_chain: Mapped[list[str]] = mapped_column(JSON, default=list)
    requests: Mapped[list[dict]] = mapped_column(JSON, default=list)
    domains: Mapped[list[str]] = mapped_column(JSON, default=list)
    html: Mapped[str] = mapped_column(Text, default="")
    screenshot_base64: Mapped[str | None] = mapped_column(Text)
    dom_signals: Mapped[dict] = mapped_column(JSON, default=dict)
    javascript_signals: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    @property
    def screenshot_available(self) -> bool:
        return bool(self.screenshot_base64)

    forensic_run: Mapped[ForensicRun] = relationship(back_populates="browser_observation")


class ProviderObservation(Base):
    __tablename__ = "provider_observations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    forensic_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32))
    response: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    forensic_run: Mapped[ForensicRun] = relationship(back_populates="provider_observations")
