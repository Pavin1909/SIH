"""Add Phase 3 infrastructure, campaign, correlation, and report storage."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003_phase3_intelligence"
down_revision = "002_forensics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid_type = postgresql.UUID(as_uuid=True)
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")
    op.create_table("infrastructure_observations", sa.Column("id", uuid_type, nullable=False), sa.Column("forensic_run_id", uuid_type, nullable=False), sa.Column("observed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("domain", sa.String(253)), sa.Column("ip", sa.String(45)), sa.Column("asn", sa.String(64)), sa.Column("asn_org", sa.Text()), sa.Column("isp", sa.Text()), sa.Column("hosting_provider", sa.Text()), sa.Column("country", sa.String(128)), sa.Column("city", sa.String(128)), sa.Column("vpn", sa.Boolean()), sa.Column("tor", sa.Boolean()), sa.Column("proxy", sa.Boolean()), sa.Column("source", sa.String(64), nullable=False), sa.Column("status", sa.String(32), nullable=False), sa.Column("raw", sa.JSON(), nullable=False), sa.ForeignKeyConstraint(["forensic_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id", "observed_at"))
    op.create_index("ix_infrastructure_observations_forensic_run_id", "infrastructure_observations", ["forensic_run_id"])
    op.create_index("ix_infrastructure_observations_observed_at", "infrastructure_observations", ["observed_at"])
    op.create_index("ix_infrastructure_observations_domain", "infrastructure_observations", ["domain"])
    op.create_index("ix_infrastructure_observations_ip", "infrastructure_observations", ["ip"])
    op.execute("SELECT create_hypertable('infrastructure_observations', 'observed_at', if_not_exists => TRUE)")
    op.create_table("campaigns", sa.Column("id", uuid_type, nullable=False), sa.Column("campaign_key", sa.String(128), nullable=False), sa.Column("confidence", sa.Float(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("campaign_key"))
    op.create_index("ix_campaigns_campaign_key", "campaigns", ["campaign_key"])
    op.create_table("campaign_indicators", sa.Column("id", uuid_type, nullable=False), sa.Column("campaign_id", uuid_type, nullable=False), sa.Column("forensic_run_id", uuid_type, nullable=False), sa.Column("indicator_type", sa.String(64), nullable=False), sa.Column("value", sa.Text(), nullable=False), sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["forensic_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_campaign_indicators_campaign_id", "campaign_indicators", ["campaign_id"])
    op.create_index("ix_campaign_indicators_forensic_run_id", "campaign_indicators", ["forensic_run_id"])
    op.create_table("correlations", sa.Column("id", uuid_type, nullable=False), sa.Column("forensic_run_id", uuid_type, nullable=False), sa.Column("related_run_id", uuid_type, nullable=False), sa.Column("score", sa.Float(), nullable=False), sa.Column("reasons", sa.JSON(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.ForeignKeyConstraint(["forensic_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["related_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_correlations_forensic_run_id", "correlations", ["forensic_run_id"])
    op.create_index("ix_correlations_related_run_id", "correlations", ["related_run_id"])
    op.create_table("forensic_reports", sa.Column("id", uuid_type, nullable=False), sa.Column("forensic_run_id", uuid_type, nullable=False), sa.Column("report_json", sa.JSON(), nullable=False), sa.Column("report_markdown", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.ForeignKeyConstraint(["forensic_run_id"], ["forensic_runs.id"], ondelete="CASCADE"), sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("forensic_run_id"))


def downgrade() -> None:
    op.drop_table("forensic_reports")
    op.drop_index("ix_correlations_related_run_id", table_name="correlations")
    op.drop_index("ix_correlations_forensic_run_id", table_name="correlations")
    op.drop_table("correlations")
    op.drop_index("ix_campaign_indicators_forensic_run_id", table_name="campaign_indicators")
    op.drop_index("ix_campaign_indicators_campaign_id", table_name="campaign_indicators")
    op.drop_table("campaign_indicators")
    op.drop_index("ix_campaigns_campaign_key", table_name="campaigns")
    op.drop_table("campaigns")
    op.drop_index("ix_infrastructure_observations_ip", table_name="infrastructure_observations")
    op.drop_index("ix_infrastructure_observations_domain", table_name="infrastructure_observations")
    op.drop_index("ix_infrastructure_observations_observed_at", table_name="infrastructure_observations")
    op.drop_index("ix_infrastructure_observations_forensic_run_id", table_name="infrastructure_observations")
    op.drop_table("infrastructure_observations")
