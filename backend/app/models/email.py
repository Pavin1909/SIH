from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    sha256: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    sender: Mapped[str | None] = mapped_column(String(2048))
    recipients: Mapped[list[str]] = mapped_column(JSON, default=list)
    subject: Mapped[str | None] = mapped_column(Text)
    headers: Mapped[dict[str, str | list[str]]] = mapped_column(JSON, default=dict)
    text_body: Mapped[str] = mapped_column(Text, default="")
    html_body: Mapped[str | None] = mapped_column(Text)
    raw_size: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    urls: Mapped[list["EmailURL"]] = relationship(back_populates="email", cascade="all, delete-orphan")
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="email", cascade="all, delete-orphan")


class EmailURL(Base):
    __tablename__ = "email_urls"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email_id: Mapped[UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(Text)
    domain: Mapped[str] = mapped_column(String(253), index=True)

    email: Mapped[Email] = relationship(back_populates="urls")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email_id: Mapped[UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"), index=True)
    model_name: Mapped[str] = mapped_column(Text)
    label: Mapped[str] = mapped_column(String(255))
    phishing_probability: Mapped[float | None] = mapped_column(nullable=True)
    email_phishing_probability: Mapped[float | None] = mapped_column(nullable=True)
    url_phishing_probability: Mapped[float] = mapped_column(default=0.0)
    class_probabilities: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    confidence: Mapped[float] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    email: Mapped[Email] = relationship(back_populates="analyses")
    forensic_runs: Mapped[list["ForensicRun"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
