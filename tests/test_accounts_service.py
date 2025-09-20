import sys
sys.path.append('.')

from datetime import datetime, timezone

from app.accounts import AccountIngestionService
from app.database import SessionLocal, drop_db, init_db
from app.repositories import Repositories


def setup_function(_):
    drop_db()
    init_db()


class DummyDepositAdapter:
    def __init__(self, records):
        self._records = records

    def fetch_deposit_accounts(self):
        return self._records


class DummyLoanAdapter:
    def __init__(self, records):
        self._records = records

    def fetch_loan_accounts(self):
        return self._records


def test_ingest_deposit_accounts_populates_repository():
    session = SessionLocal()
    try:
        repos = Repositories(session)
        adapter = DummyDepositAdapter(
            [
                {
                    "id": "dep-1",
                    "account_number": "D001",
                    "customer_name": "Alice",
                    "product_name": "Savings",
                    "status": "active",
                    "balance": 2500.5,
                    "currency": "ZAR",
                    "source_reference": "CORE-001",
                    "source_metadata": {"branch": "HQ"},
                    "metadata": {"segment": "retail"},
                }
            ]
        )
        service = AccountIngestionService(
            repos,
            deposit_adapter=adapter,
            default_source_system="core-banking",
        )
        ingested = service.ingest_deposits()
        assert len(ingested) == 1
        stored = repos.imported_deposit_accounts.get("dep-1")
        assert stored is not None
        assert stored.audit.system == "core-banking"
        assert stored.audit.reference == "CORE-001"
        assert stored.audit.ingested_at.tzinfo is not None
        assert stored.audit.metadata == {"branch": "HQ"}
        assert stored.metadata == {"segment": "retail"}
    finally:
        session.close()


def test_ingest_loans_uses_provided_audit_metadata():
    explicit_ingested = datetime(2024, 5, 10, 12, 0, tzinfo=timezone.utc)
    session = SessionLocal()
    try:
        repos = Repositories(session)
        loan_adapter = DummyLoanAdapter(
            [
                {
                    "id": "loan-9",
                    "account_number": "L009",
                    "customer_name": "Bob",
                    "product_name": "Home Loan",
                    "status": "funded",
                    "principal_amount": 500000.0,
                    "outstanding_balance": 420000.0,
                    "interest_rate": 7.5,
                    "audit": {
                        "system": "loan-ledger",
                        "reference": "LL-42",
                        "ingested_at": explicit_ingested.isoformat(),
                        "metadata": {"batch": "nightly"},
                    },
                    "metadata": {"portfolio": "residential"},
                }
            ]
        )
        service = AccountIngestionService(
            repos,
            loan_adapter=loan_adapter,
            default_source_system="core-banking",
        )
        result = service.ingest()
        assert len(result.loans) == 1
        stored = repos.imported_loan_accounts.get("loan-9")
        assert stored is not None
        assert stored.audit.system == "loan-ledger"
        assert stored.audit.reference == "LL-42"
        assert stored.audit.ingested_at == explicit_ingested
        assert stored.audit.metadata == {"batch": "nightly"}
        assert stored.metadata == {"portfolio": "residential"}
    finally:
        session.close()
