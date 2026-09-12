import hashlib
from functools import lru_cache

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.models import Analysis, Email, EmailURL
from app.services.classifier import DistilBertClassifier
from app.services.email_parser import ParsedEmail, html_to_text
from app.services.url_extractor import extract_urls_and_domains


@lru_cache
def get_classifier(model_name: str, model_revision: str | None) -> DistilBertClassifier:
    settings = get_settings().model_copy(update={"model_name": model_name, "model_revision": model_revision})
    return DistilBertClassifier(settings)


def analyze_email(db: Session, raw_email: bytes, settings: Settings | None = None) -> Analysis:
    from app.services.email_parser import parse_email

    parsed: ParsedEmail = parse_email(raw_email)
    email_hash = hashlib.sha256(raw_email).hexdigest()
    settings = settings or get_settings()
    visible_html_text = html_to_text(parsed.html_body) if parsed.html_body else ""
    model_input = "\n\n".join(part for part in (parsed.subject or "", parsed.text_body, visible_html_text) if part).strip()
    classifier = get_classifier(settings.model_name, settings.model_revision)
    prediction = classifier.classify(model_input)

    email = db.scalar(select(Email).where(Email.sha256 == email_hash))
    if email is None:
        email = Email(
            sha256=email_hash,
            sender=parsed.sender,
            recipients=parsed.recipients,
            subject=parsed.subject,
            headers=parsed.headers,
            text_body=parsed.text_body,
            html_body=parsed.html_body,
            raw_size=len(raw_email),
        )
        db.add(email)
        db.flush()
        for url, domain in extract_urls_and_domains(parsed.subject, parsed.text_body, parsed.html_body):
            db.add(EmailURL(email_id=email.id, url=url, domain=domain))
        db.flush()

    analysis = Analysis(
        email_id=email.id,
        model_name=prediction.model_name,
        label=prediction.label,
        phishing_probability=prediction.email_phishing_probability,
        email_phishing_probability=prediction.email_phishing_probability,
        url_phishing_probability=prediction.url_phishing_probability,
        class_probabilities=prediction.class_probabilities,
        confidence=prediction.confidence,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    db.refresh(email)
    return analysis


def get_analysis(db: Session, analysis_id):
    return db.scalar(
        select(Analysis)
        .options(selectinload(Analysis.email).selectinload(Email.urls))
        .where(Analysis.id == analysis_id)
    )


def get_email(db: Session, email_id):
    return db.scalar(select(Email).options(selectinload(Email.urls)).where(Email.id == email_id))
