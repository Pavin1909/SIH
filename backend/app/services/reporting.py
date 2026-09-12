from app.models import ForensicRun
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import ForensicReport


def build_report(run: ForensicRun, infrastructure: list[dict], correlation_reasons: list[str], graph_status: str) -> tuple[dict, str]:
    evidence = run.fused_evidence
    correlation_lines = [f"- {reason}" for reason in sorted(set(correlation_reasons))]
    if not correlation_lines:
        correlation_lines = ["- No related historical observation found."]
    report = {
        "run_id": str(run.id),
        "url": run.url,
        "verdict": run.verdict,
        "risk_score": run.risk_score,
        "evidence": evidence,
        "infrastructure": infrastructure,
        "historical_correlation": {"reasons": sorted(set(correlation_reasons)), "status": "observed" if correlation_reasons else "no_related_observation"},
        "campaign_graph": {"status": graph_status},
        "limitations": ["Unconfigured external providers are not treated as negative evidence."],
    }
    markdown = "\n".join([
        f"# SandBoxTrace Forensic Report: {run.id}",
        "",
        f"- URL: `{run.url}`",
        f"- Verdict: **{run.verdict}**",
        f"- Risk score: **{run.risk_score}/100**",
        "",
        "## Evidence",
        *[f"- {signal}" for signal in evidence.get("signals", [])],
        "",
        "## Infrastructure",
        *[f"- {item.get('domain') or item.get('ip')}: {item.get('enrichment_status', item.get('status', 'unknown'))}" for item in infrastructure],
        "",
        "## Correlation",
        *correlation_lines,
        "",
        f"Graph status: `{graph_status}`",
    ])
    return report, markdown


def get_report(db: Session, run_id):
    return db.scalar(select(ForensicReport).where(ForensicReport.forensic_run_id == run_id))
