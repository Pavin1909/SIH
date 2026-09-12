import hashlib

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Campaign, CampaignIndicator, Correlation, ForensicRun, InfrastructureObservation


def campaign_key(observations: list[dict]) -> str:
    indicators = sorted({f"{item.get('domain','')}|{item.get('ip','')}" for item in observations if item.get("domain") or item.get("ip")})
    digest = hashlib.sha256("\n".join(indicators).encode()).hexdigest()[:24]
    return f"campaign-{digest or 'unresolved'}"


def correlate(db: Session, run: ForensicRun, observations: list[dict]) -> tuple[Campaign, list[Correlation], list[str]]:
    domains = {item.get("domain") for item in observations if item.get("domain")}
    ips = {item.get("ip") for item in observations if item.get("ip")}
    prior = db.scalars(select(InfrastructureObservation).where(InfrastructureObservation.forensic_run_id != run.id, or_(InfrastructureObservation.domain.in_(domains) if domains else False, InfrastructureObservation.ip.in_(ips) if ips else False))).all()
    related: dict[str, tuple[float, list[str]]] = {}
    for item in prior:
        reasons: list[str] = []
        if item.domain in domains:
            reasons.append("shared_domain")
        if item.ip in ips:
            reasons.append("shared_ip")
        score = min(1.0, 0.5 * len(reasons))
        related[str(item.forensic_run_id)] = (score, reasons)
    for related_id, (score, reasons) in related.items():
        db.add(Correlation(forensic_run_id=run.id, related_run_id=related_id, score=score, reasons=reasons))
    key = campaign_key(observations)
    campaign = db.scalar(select(Campaign).where(Campaign.campaign_key == key))
    if campaign is None:
        campaign = Campaign(campaign_key=key, confidence=max((score for score, _ in related.values()), default=0.0))
        db.add(campaign)
        db.flush()
    for item in observations:
        for indicator_type in ("domain", "ip"):
            value = item.get(indicator_type)
            if value:
                db.add(CampaignIndicator(campaign_id=campaign.id, forensic_run_id=run.id, indicator_type=indicator_type, value=value))
    return campaign, [Correlation(forensic_run_id=run.id, related_run_id=related_id, score=score, reasons=reasons) for related_id, (score, reasons) in related.items()], [reason for _, reasons in related.values() for reason in reasons]
