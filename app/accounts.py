"""Services for ingesting external account data."""

from __future__ import annotations

import argparse
import importlib
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Optional, Protocol

from pydantic import BaseModel, ValidationError

from .database import SessionLocal
from .models import (
    ImportedDepositAccount,
    ImportedLoanAccount,
    SourceAuditInfo,
)
from .repositories import Repositories


class DepositAccountAdapter(Protocol):
    """Adapter that yields deposit account records from an external system."""

    def fetch_deposit_accounts(self) -> Iterable[Mapping[str, Any] | ImportedDepositAccount]:
        ...


class LoanAccountAdapter(Protocol):
    """Adapter that yields loan account records from an external system."""

    def fetch_loan_accounts(self) -> Iterable[Mapping[str, Any] | ImportedLoanAccount]:
        ...


@dataclass
class IngestionResult:
    deposits: list[ImportedDepositAccount]
    loans: list[ImportedLoanAccount]


class AccountIngestionService:
    """Persist imported deposit and loan account records using repositories."""

    def __init__(
        self,
        repos: Repositories,
        *,
        deposit_adapter: Optional[DepositAccountAdapter] = None,
        loan_adapter: Optional[LoanAccountAdapter] = None,
        default_source_system: str = "external",
    ) -> None:
        self._repos = repos
        self._deposit_adapter = deposit_adapter
        self._loan_adapter = loan_adapter
        self._default_source_system = default_source_system

    def ingest(self) -> IngestionResult:
        """Run both deposit and loan ingestions."""

        deposits = self.ingest_deposits()
        loans = self.ingest_loans()
        return IngestionResult(deposits=deposits, loans=loans)

    def ingest_deposits(self) -> list[ImportedDepositAccount]:
        if not self._deposit_adapter:
            return []
        records = self._deposit_adapter.fetch_deposit_accounts()
        return self._store_records(records, self._repos.imported_deposit_accounts, ImportedDepositAccount)

    def ingest_loans(self) -> list[ImportedLoanAccount]:
        if not self._loan_adapter:
            return []
        records = self._loan_adapter.fetch_loan_accounts()
        return self._store_records(records, self._repos.imported_loan_accounts, ImportedLoanAccount)

    def _store_records(
        self,
        records: Iterable[Mapping[str, Any] | BaseModel],
        repository,
        model: type[ImportedDepositAccount] | type[ImportedLoanAccount],
    ) -> list[ImportedDepositAccount] | list[ImportedLoanAccount]:
        stored: list[ImportedDepositAccount] | list[ImportedLoanAccount] = []
        for raw in records:
            prepared = self._prepare_record(raw, model)
            repository.add(prepared)
            stored.append(prepared)
        return stored

    def _prepare_record(
        self,
        record: Mapping[str, Any] | BaseModel,
        model: type[ImportedDepositAccount] | type[ImportedLoanAccount],
    ) -> ImportedDepositAccount | ImportedLoanAccount:
        if isinstance(record, BaseModel):
            data = record.model_dump()
        else:
            data = dict(record)

        audit_payload = self._pop_audit_payload(data)
        audit = self._build_audit(audit_payload, data)

        metadata = data.get("metadata")
        if metadata is None:
            data["metadata"] = {}
        elif not isinstance(metadata, dict):
            raise TypeError("metadata must be a mapping if provided")

        payload = {**data, "audit": audit}

        try:
            parsed = model.model_validate(payload)
        except ValidationError as exc:  # pragma: no cover - validation errors surface in tests
            raise ValueError(f"Invalid {model.__name__} payload: {exc}") from exc
        return parsed

    def _pop_audit_payload(self, data: dict[str, Any]) -> dict[str, Any] | SourceAuditInfo | None:
        audit = data.pop("audit", None)
        if audit is not None:
            return audit

        payload: dict[str, Any] = {
            "system": data.pop("source_system", self._default_source_system),
            "reference": data.pop("source_reference", str(data.get("id"))),
            "ingested_at": data.pop("ingested_at", None),
            "metadata": data.pop("source_metadata", {}) or {},
        }
        return payload

    def _build_audit(
        self, audit_payload: dict[str, Any] | SourceAuditInfo | None, context: Mapping[str, Any]
    ) -> dict[str, Any]:
        if audit_payload is None:
            audit_payload = {}
        if isinstance(audit_payload, SourceAuditInfo):
            audit_dict = audit_payload.model_dump()
        else:
            audit_dict = dict(audit_payload)

        audit_dict.setdefault("system", self._default_source_system)
        audit_dict.setdefault("reference", str(context.get("id")))
        audit_dict["ingested_at"] = self._normalize_datetime(audit_dict.get("ingested_at"))
        metadata = audit_dict.get("metadata")
        if metadata is None:
            audit_dict["metadata"] = {}
        elif not isinstance(metadata, dict):
            raise TypeError("audit.metadata must be a mapping")
        return audit_dict

    @staticmethod
    def _normalize_datetime(value: Any) -> datetime:
        if isinstance(value, datetime):
            dt = value
        elif isinstance(value, str) and value:
            cleaned = value.replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
        else:
            dt = datetime.now(timezone.utc)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt


def _load_adapter(spec: str | None) -> Any:
    if not spec:
        return None
    module_path, factory_name = (spec.split(":", 1) if ":" in spec else spec.rsplit(".", 1))
    module = importlib.import_module(module_path)
    factory = getattr(module, factory_name)
    return factory() if callable(factory) else factory


def run_sync(
    deposit_adapter_spec: str | None,
    loan_adapter_spec: str | None,
    *,
    default_source_system: str,
) -> IngestionResult:
    session = SessionLocal()
    try:
        repos = Repositories(session)
        deposit_adapter = _load_adapter(deposit_adapter_spec)
        loan_adapter = _load_adapter(loan_adapter_spec)
        service = AccountIngestionService(
            repos,
            deposit_adapter=deposit_adapter,
            loan_adapter=loan_adapter,
            default_source_system=default_source_system,
        )
        return service.ingest()
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Synchronise external deposit and loan accounts")
    parser.add_argument("--deposit-adapter", help="Dotted path to deposit adapter factory or instance")
    parser.add_argument("--loan-adapter", help="Dotted path to loan adapter factory or instance")
    parser.add_argument(
        "--source-system",
        default=os.environ.get("EXTERNAL_SOURCE_SYSTEM", "external"),
        help="Default source system label to use when adapters do not provide one",
    )
    args = parser.parse_args()
    result = run_sync(
        args.deposit_adapter,
        args.loan_adapter,
        default_source_system=args.source_system,
    )
    print(
        "Ingested",
        f"{len(result.deposits)} deposit account(s)",
        "and",
        f"{len(result.loans)} loan account(s)",
    )


if __name__ == "__main__":  # pragma: no cover - manual execution
    main()
