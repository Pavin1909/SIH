from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.models import BrowserObservation, ForensicReport, ForensicRun, InfrastructureObservation
from app.services.correlation import correlate
from app.services.graph import CampaignGraph
from app.services.infrastructure import InfrastructureEnricher
from app.services.reporting import build_report


def final_verdict(score: float, infrastructure: list[dict], correlation_reasons: list[str]) -> tuple[str, float]:
    adjusted = score
    for item in infrastructure:
        if item.get("tor") is True or item.get("vpn") is True or item.get("proxy") is True:
            adjusted += 5
    if correlation_reasons:
        adjusted += min(15, 5 * len(set(correlation_reasons)))
    adjusted = min(100.0, round(adjusted, 4))
    return ("CONFIRMED_MALICIOUS" if adjusted >= 75 else "SUSPICIOUS" if adjusted >= 35 else "BENIGN", adjusted)


async def enrich_forensic_run(db: Session, run_id, settings: Settings | None = None) -> ForensicRun:
    settings = settings or get_settings()
    run = db.scalar(select(ForensicRun).options(selectinload(ForensicRun.browser_observation)).where(ForensicRun.id == run_id))
    if run is None:
        raise LookupError("Forensic analysis not found")
    browser = run.browser_observation
    domains = browser.domains if browser else []
    observations = (await InfrastructureEnricher(settings).enrich(run.url, domains)).observations
    for item in observations:
        db.add(InfrastructureObservation(forensic_run_id=run.id, domain=item.get("domain"), ip=item.get("ip"), asn=item.get("asn"), asn_org=item.get("asn_org"), isp=item.get("isp"), hosting_provider=item.get("hosting_provider"), country=item.get("country"), region=item.get("region"), city=item.get("city"), latitude=item.get("latitude"), longitude=item.get("longitude"), timezone=item.get("timezone"), vpn=item.get("vpn"), tor=item.get("tor"), proxy=item.get("proxy"), source=item.get("source", "unknown"), status=item.get("enrichment_status", item.get("status", "unknown")), raw=item.get("raw", {})))
    campaign, _, correlation_reasons = correlate(db, run, observations)
    graph = CampaignGraph(settings).upsert(str(run.id), observations, campaign.campaign_key)
    verdict, risk_score = final_verdict(run.risk_score, observations, correlation_reasons)
    run.verdict = verdict
    run.risk_score = risk_score
    run.fused_evidence = {**run.fused_evidence, "infrastructure": observations, "correlation": {"reasons": correlation_reasons}, "campaign": {"key": campaign.campaign_key, "confidence": campaign.confidence}, "graph": {"status": graph.status}}
    report_json, report_markdown = build_report(run, observations, correlation_reasons, graph.status)
    report = db.scalar(select(ForensicReport).where(ForensicReport.forensic_run_id == run.id))
    if report is None:
        report = ForensicReport(forensic_run_id=run.id, report_json=report_json, report_markdown=report_markdown)
        db.add(report)
    else:
        report.report_json = report_json
        report.report_markdown = report_markdown
    db.commit()
    db.refresh(run)
    return run
