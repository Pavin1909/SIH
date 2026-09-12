"""Store explicit four-class model probabilities."""

from alembic import op
import sqlalchemy as sa

revision = "005_model_probability_semantics"
down_revision = "004_geoip_coordinates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("analyses", "phishing_probability", existing_type=sa.Float(), nullable=True)
    op.add_column("analyses", sa.Column("email_phishing_probability", sa.Float(), nullable=True))
    op.add_column("analyses", sa.Column("url_phishing_probability", sa.Float(), nullable=False, server_default="0"))
    op.add_column("analyses", sa.Column("class_probabilities", sa.JSON(), nullable=False, server_default="{}"))


def downgrade() -> None:
    op.drop_column("analyses", "class_probabilities")
    op.drop_column("analyses", "url_phishing_probability")
    op.drop_column("analyses", "email_phishing_probability")
    op.alter_column("analyses", "phishing_probability", existing_type=sa.Float(), nullable=False)