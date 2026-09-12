"""Create Phase 1 email analysis tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid_type = postgresql.UUID(as_uuid=True)
    op.create_table(
        "emails",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("sender", sa.String(length=2048), nullable=True),
        sa.Column("recipients", sa.JSON(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("headers", sa.JSON(), nullable=False),
        sa.Column("text_body", sa.Text(), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=True),
        sa.Column("raw_size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sha256"),
    )
    op.create_index("ix_emails_sha256", "emails", ["sha256"], unique=False)
    op.create_table(
        "email_urls",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("email_id", uuid_type, nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(length=253), nullable=False),
        sa.ForeignKeyConstraint(["email_id"], ["emails.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_urls_email_id", "email_urls", ["email_id"], unique=False)
    op.create_index("ix_email_urls_domain", "email_urls", ["domain"], unique=False)
    op.create_table(
        "analyses",
        sa.Column("id", uuid_type, nullable=False),
        sa.Column("email_id", uuid_type, nullable=False),
        sa.Column("model_name", sa.Text(), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("phishing_probability", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["email_id"], ["emails.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analyses_email_id", "analyses", ["email_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_analyses_email_id", table_name="analyses")
    op.drop_table("analyses")
    op.drop_index("ix_email_urls_domain", table_name="email_urls")
    op.drop_index("ix_email_urls_email_id", table_name="email_urls")
    op.drop_table("email_urls")
    op.drop_index("ix_emails_sha256", table_name="emails")
    op.drop_table("emails")
