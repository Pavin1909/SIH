from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class InfrastructureObservation(Base):
    __tablename__ = "infrastructure_observations"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    forensic_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), index=True)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, primary_key=True)
    domain: Mapped[str | None] = mapped_column(String(253), index=True)
    ip: Mapped[str | None] = mapped_column(String(45), index=True)
    asn: Mapped[str | None] = mapped_column(String(64))
    asn_org: Mapped[str | None] = mapped_column(Text)
    isp: Mapped[str | None] = mapped_column(Text)
    hosting_provider: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(String(128))
    region: Mapped[str | None] = mapped_column(String(128))
    city: Mapped[str | None] = mapped_column(String(128))
    latitude: Mapped[float | None] = mapped_column()
    longitude: Mapped[float | None] = mapped_column()
    timezone: Mapped[str | None] = mapped_column(String(128))
    vpn: Mapped[bool | None] = mapped_column()
    tor: Mapped[bool | None] = mapped_column()
    proxy: Mapped[bool | None] = mapped_column()
    source: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(32))
    raw: Mapped[dict] = mapped_column(JSON, default=dict)

    forensic_run: Mapped["ForensicRun"] = relationship()


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    campaign_key: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    confidence: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    indicators: Mapped[list["CampaignIndicator"]] = relationship(back_populates="campaign", cascade="all, delete-orphan")


class CampaignIndicator(Base):
    __tablename__ = "campaign_indicators"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    campaign_id: Mapped[UUID] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    forensic_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), index=True)
    indicator_type: Mapped[str] = mapped_column(String(64))
    value: Mapped[str] = mapped_column(Text)

    campaign: Mapped[Campaign] = relationship(back_populates="indicators")


class Correlation(Base):
    __tablename__ = "correlations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    forensic_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), index=True)
    related_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), index=True)
    score: Mapped[float] = mapped_column()
    reasons: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ForensicReport(Base):
    __tablename__ = "forensic_reports"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    forensic_run_id: Mapped[UUID] = mapped_column(ForeignKey("forensic_runs.id", ondelete="CASCADE"), unique=True)
    report_json: Mapped[dict] = mapped_column(JSON, default=dict)
    report_markdown: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
