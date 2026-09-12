"""Add GeoIP location fields to infrastructure observations."""

from alembic import op
import sqlalchemy as sa

revision = "004_geoip_coordinates"
down_revision = "003_phase3_intelligence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("infrastructure_observations", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("infrastructure_observations", sa.Column("longitude", sa.Float(), nullable=True))
    op.add_column("infrastructure_observations", sa.Column("timezone", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("infrastructure_observations", "timezone")
    op.drop_column("infrastructure_observations", "longitude")
    op.drop_column("infrastructure_observations", "latitude")
