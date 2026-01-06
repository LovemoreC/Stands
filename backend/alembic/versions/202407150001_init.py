"""initial schema

Revision ID: 202407150001
Revises: 
Create Date: 2024-07-15 00:01:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "202407150001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
    )

    op.create_table(
        "stands",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("stand_number", sa.String(), nullable=False),
        sa.Column("size_m2", sa.Numeric(), nullable=False),
        sa.Column("price", sa.Numeric(), nullable=False),
        sa.Column("status", sa.Enum("AVAILABLE", "RESERVED", "SOLD", "BLOCKED", name="standstatus"), nullable=False, server_default="AVAILABLE"),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("national_id", sa.String(), nullable=False, unique=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
    )

    op.create_table(
        "reservations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stand_id", sa.Integer(), sa.ForeignKey("stands.id"), nullable=False),
        sa.Column("realtor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("reservation_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED", name="reservationstatus"), nullable=False, server_default="PENDING"),
    )

    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stand_id", sa.Integer(), sa.ForeignKey("stands.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("sale_date", sa.Date(), nullable=False),
        sa.Column("sale_price", sa.Numeric(), nullable=False),
        sa.Column("status", sa.Enum("ACTIVE", "COMPLETED", "CANCELLED", name="salestatus"), nullable=False, server_default="ACTIVE"),
    )

    op.create_table(
        "payment_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("total_due", sa.Numeric(), nullable=False),
        sa.Column("deposit_due", sa.Numeric(), nullable=False),
        sa.Column("installment_amount", sa.Numeric(), nullable=False),
        sa.Column("frequency", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sale_id", sa.Integer(), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("amount", sa.Numeric(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("reference", sa.String(), nullable=True),
        sa.Column("recorded_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entity", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("meta_json", sa.JSON(), nullable=True),
    )


def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("payments")
    op.drop_table("payment_plans")
    op.drop_table("sales")
    op.drop_table("reservations")
    op.drop_table("clients")
    op.drop_table("stands")
    op.drop_table("projects")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS standstatus")
    op.execute("DROP TYPE IF EXISTS reservationstatus")
    op.execute("DROP TYPE IF EXISTS salestatus")
