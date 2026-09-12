import logging

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.models import Analysis, BrowserObservation, EmailURL, ForensicRun, ProviderObservation
from app.services.fusion import fuse_evidence
from app.services.sandbox_client import SandboxClient
from app.services.threat_intel import ThreatIntelClient
from app.services.vlm_client import VLMClient

logger = logging.getLogger(__name__)


async def run_forensics(db: Session, analysis_id, url_id, settings: Settings | None = None) -> ForensicRun:
    settings = settings or get_settings()
    analysis = db.scalar(select(Analysis).where(Analysis.id == analysis_id))
    if analysis is None:
        raise LookupError("Analysis or URL not found")
    email_url = db.scalar(select(EmailURL).where(EmailURL.id == url_id, EmailURL.email_id == analysis.email_id))
    if email_url is None:
        raise LookupError("Analysis or URL not found")
    browser = await SandboxClient(settings).render(email_url.url)
    vlm_context = {
        "initial_url": browser.get("initial_url"),
        "final_url": browser.get("final_url"),
        "redirect_chain": browser.get("redirect_chain", []),
        "domains": browser.get("domains", []),
        "dom_signals": browser.get("dom_signals", {}),
        "javascript_signals": browser.get("javascript_signals", {}),
    }
    vlm_result = await VLMClient(settings).analyze(browser.get("screenshot_base64"), vlm_context)
    provider_results = await ThreatIntelClient(settings).lookup(email_url.url, browser.get("domains", []))
    provider_dicts = [{"provider": item.provider, "status": item.status, "response": item.response} for item in provider_results]
    fusion = fuse_evidence(analysis.email_phishing_probability, browser, {"status": vlm_result.status, "response": vlm_result.response}, provider_dicts, analysis.url_phishing_probability)
    run = ForensicRun(analysis_id=analysis.id, email_url_id=email_url.id, url=email_url.url, status="completed", verdict=fusion.verdict, risk_score=fusion.risk_score, fused_evidence=fusion.evidence)
    db.add(run)
    db.flush()
    db.add(BrowserObservation(forensic_run_id=run.id, initial_url=browser["initial_url"], final_url=browser.get("final_url"), redirect_chain=browser.get("redirect_chain", []), requests=browser.get("requests", []), domains=browser.get("domains", []), html=browser.get("html", ""), screenshot_base64=browser.get("screenshot_base64"), dom_signals=browser.get("dom_signals", {}), javascript_signals=browser.get("javascript_signals", {})))
    db.add(ProviderObservation(forensic_run_id=run.id, provider="vlm", status=vlm_result.status, response=vlm_result.response))
    for item in provider_results:
        db.add(ProviderObservation(forensic_run_id=run.id, provider=item.provider, status=item.status, response=item.response))
    db.commit()
    db.refresh(run)
    try:
        from app.services.phase3_service import enrich_forensic_run

        run = await enrich_forensic_run(db, run.id, settings)
    except Exception as exc:
        logger.exception("Phase 3 enrichment failed for forensic run %s", run.id)
        db.rollback()
        run = db.scalar(select(ForensicRun).where(ForensicRun.id == run.id))
        if run is not None:
            run.fused_evidence = {**run.fused_evidence, "phase3": {"status": "error", "error": str(exc)}}
            db.commit()
            db.refresh(run)
    return run


def get_forensic_run(db: Session, run_id):
    return db.scalar(select(ForensicRun).options(selectinload(ForensicRun.browser_observation), selectinload(ForensicRun.provider_observations)).where(ForensicRun.id == run_id))
