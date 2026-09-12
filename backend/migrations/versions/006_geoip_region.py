"""Persist provider-supplied subdivision/region."""

from alembic import op
import sqlalchemy as sa

revision = "006_geoip_region"
down_revision = "005_model_probability_semantics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("infrastructure_observations", sa.Column("region", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("infrastructure_observations", "region")
