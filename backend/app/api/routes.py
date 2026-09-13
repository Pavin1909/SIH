import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.database.session import get_db
from app.schemas.analysis import AnalysisResponse, AnalysisWithEmailResponse, LatestInvestigationResponse
from app.schemas.email import EmailResponse
from app.schemas.forensics import ForensicResponse, ReportResponse
from app.services.analysis_service import analyze_email, get_analysis, get_email
from app.services.classifier import ModelNotConfiguredError
from app.services.forensic_service import get_forensic_run, run_forensics
from app.services.sandbox_client import SandboxUnavailableError
from app.services.auth import require_phase3_access
from app.services.phase3_service import enrich_forensic_run
from app.services.reporting import get_report
from app.services.status import status_manager
from app.models import Analysis, Email, ForensicRun

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1")


@router.post("/emails/analyze", response_model=AnalysisWithEmailResponse, status_code=status.HTTP_201_CREATED)
async def analyze_uploaded_email(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AnalysisWithEmailResponse:
    if file.filename and not file.filename.lower().endswith(".eml"):
        raise HTTPException(status_code=415, detail="Only .eml email files are accepted")
    raw_email = await file.read(settings.max_email_size_bytes + 1)
    if len(raw_email) > settings.max_email_size_bytes:
        raise HTTPException(status_code=413, detail="Email exceeds the configured size limit")
    if not raw_email:
        raise HTTPException(status_code=400, detail="Uploaded email is empty")
    try:
        analysis = analyze_email(db, raw_email, settings)
    except ModelNotConfiguredError as exc:
        logger.error("Email analysis unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        db.rollback()
        logger.exception("Email analysis failed")
        raise HTTPException(status_code=422, detail="The uploaded email could not be analyzed")
    analysis.email.urls
    return analysis


@router.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
def read_analysis(analysis_id: UUID, db: Session = Depends(get_db)) -> AnalysisResponse:
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.get("/investigations/latest", response_model=LatestInvestigationResponse)
def read_latest_investigation(db: Session = Depends(get_db)) -> LatestInvestigationResponse:
    analysis = db.scalar(
        select(Analysis)
        .options(selectinload(Analysis.email).selectinload(Email.urls))
        .order_by(Analysis.created_at.desc())
        .limit(1)
    )
    if analysis is None:
        return {"analysis": None, "forensic": None}
    forensic = db.scalar(
        select(ForensicRun)
        .options(selectinload(ForensicRun.browser_observation), selectinload(ForensicRun.provider_observations))
        .where(ForensicRun.analysis_id == analysis.id)
        .order_by(ForensicRun.created_at.desc())
        .limit(1)
    )
    return {"analysis": analysis, "forensic": forensic}


@router.get("/analyses/{analysis_id}/forensics/latest", response_model=ForensicResponse)
def read_latest_forensic_for_analysis(analysis_id: UUID, db: Session = Depends(get_db)) -> ForensicResponse:
    run = db.scalar(
        select(ForensicRun)
        .options(selectinload(ForensicRun.browser_observation), selectinload(ForensicRun.provider_observations))
        .where(ForensicRun.analysis_id == analysis_id)
        .order_by(ForensicRun.created_at.desc())
        .limit(1)
    )
    if run is None:
        raise HTTPException(status_code=404, detail="No forensic run exists for this analysis")
    return run


@router.get("/emails/{email_id}", response_model=EmailResponse)
def read_email(email_id: UUID, db: Session = Depends(get_db)) -> EmailResponse:
    email = get_email(db, email_id)
    if email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.post("/analyses/{analysis_id}/forensics/{url_id}", response_model=ForensicResponse, status_code=status.HTTP_201_CREATED)
async def create_forensic_analysis(analysis_id: UUID, url_id: UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> ForensicResponse:
    try:
        await status_manager.publish(str(analysis_id), {"stage": "forensic_started", "analysis_id": str(analysis_id)})
        return await run_forensics(db, analysis_id, url_id, settings)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SandboxUnavailableError as exc:
        db.rollback()
        logger.exception("Sandbox unavailable")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Forensic analysis failed")
        raise HTTPException(status_code=502, detail="Forensic analysis failed") from exc


@router.get("/forensics/{run_id}", response_model=ForensicResponse)
def read_forensic_analysis(run_id: UUID, db: Session = Depends(get_db)) -> ForensicResponse:
    run = get_forensic_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Forensic analysis not found")
    return run


@router.post("/forensics/{run_id}/enrich", response_model=ForensicResponse, dependencies=[Depends(require_phase3_access)])
async def enrich_forensic_analysis(run_id: UUID, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> ForensicResponse:
    try:
        run = await enrich_forensic_run(db, run_id, settings)
        await status_manager.publish(str(run.analysis_id), {"stage": "completed", "run_id": str(run.id), "verdict": run.verdict})
        return run
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Phase 3 enrichment failed")
        raise HTTPException(status_code=502, detail="Phase 3 enrichment failed") from exc


@router.get("/forensics/{run_id}/report", response_model=ReportResponse, dependencies=[Depends(require_phase3_access)])
def read_report(run_id: UUID, db: Session = Depends(get_db)) -> ReportResponse:
    report = get_report(db, run_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Forensic report not found")
    return {"run_id": run_id, "report_json": report.report_json, "report_markdown": report.report_markdown}


@router.websocket("/ws/analyses/{analysis_id}")
async def analysis_status_websocket(websocket: WebSocket, analysis_id: UUID) -> None:
    key = str(analysis_id)
    await status_manager.connect(key, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        status_manager.disconnect(key, websocket)

