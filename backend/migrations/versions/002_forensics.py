"""Create Phase 2 forensic evidence tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002_forensics"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid_type = postgresql.UUID(as_uuid=True)
    op.create_table("forensic_runs", sa.Column("id", uuid_type, nullable=False), sa.Column("analysis_id", uuid_type, nullable=False), sa.Column("email_url_id", uuid_type, nullable=False), sa.Column("url", sa.Text(), nullable=False), sa.Column("status", sa.String(32), nullable=False), sa.Column("verdict", sa.String(64), nullable=False), sa.Column("risk_score", sa.Float(), nullable=False), sa.Column("fused_evidence", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.ForeignKeyConstraint(["analysis_id"], ["analyses.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["email_url_id"], ["email_urls.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_forensic_runs_analysis_id", "forensic_runs", ["analysis_id"])
    op.create_index("ix_forensic_runs_email_url_id", "forensic_runs", ["email_url_id"])
    op.create_table("browser_observations", sa.Column("id", uuid_type, nullable=False), sa.Column("forensic_run_id", uuid_type, nullable=False), sa.Column("initial_url", sa.Text(), nullable=False), sa.Column("final_url", sa.Text()), sa.Column("redirect_chain", sa.JSON(), nullable=False), sa.Column("requests", sa.JSON(), nullable=False), sa.Column("domains", sa.JSON(), nullable=False), sa.Column("html", sa.Text(), nullable=False), sa.Column("screenshot_base64", sa.Text()), sa.Column("dom_signals", sa.JSON(), nullable=False), sa.Column("javascript_signals", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.ForeignKeyConstraint(["forensic_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("forensic_run_id"))
    op.create_table("provider_observations", sa.Column("id", uuid_type, nullable=False), sa.Column("forensic_run_id", uuid_type, nullable=False), sa.Column("provider", sa.String(64), nullable=False), sa.Column("status", sa.String(32), nullable=False), sa.Column("response", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.ForeignKeyConstraint(["forensic_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_provider_observations_forensic_run_id", "provider_observations", ["forensic_run_id"])


def downgrade() -> None:
    op.drop_index("ix_provider_observations_forensic_run_id", table_name="provider_observations")
    op.drop_table("provider_observations")
    op.drop_table("browser_observations")
    op.drop_index("ix_forensic_runs_email_url_id", table_name="forensic_runs")
    op.drop_index("ix_forensic_runs_analysis_id", table_name="forensic_runs")
    op.drop_table("forensic_runs")
