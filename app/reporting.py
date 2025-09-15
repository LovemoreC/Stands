"""Reporting utilities for generating CSV rows and streaming data."""

from io import StringIO
import csv
from typing import Iterable, Iterator, Optional

from .repositories import Repositories
from .models import (
    PropertyStatus,
    MandateStatus,
    SubmissionStatus,
)


def generate_properties_report(
    repos: Repositories, status: Optional[PropertyStatus] = None
) -> Iterator[dict]:
    """Yield rows for the properties report."""
    projects = {p.id: p.name for p in repos.projects.list()}
    for stand in repos.stands.list():
        if status and stand.status != status:
            continue
        yield {
            "project_id": stand.project_id,
            "project_name": projects.get(stand.project_id, ""),
            "stand_id": stand.id,
            "stand_name": stand.name,
            "price": stand.price,
            "status": stand.status.value,
            "mandate_status": stand.mandate.status.value if stand.mandate else "",
        }


def generate_mandates_report(
    repos: Repositories, status: Optional[MandateStatus] = None
) -> Iterator[dict]:
    """Yield rows for mandates across properties."""
    projects = {p.id: p.name for p in repos.projects.list()}
    for stand in repos.stands.list():
        if not stand.mandate:
            continue
        if status and stand.mandate.status != status:
            continue
        yield {
            "project_id": stand.project_id,
            "project_name": projects.get(stand.project_id, ""),
            "stand_id": stand.id,
            "stand_name": stand.name,
            "agent": stand.mandate.agent,
            "status": stand.mandate.status.value,
            "expiration_date": stand.mandate.expiration_date.isoformat()
            if stand.mandate.expiration_date
            else "",
        }


def generate_loans_report(
    repos: Repositories, status: Optional[SubmissionStatus] = None
) -> Iterator[dict]:
    """Yield rows for loan application reports."""
    for app in repos.loan_applications.list():
        if status and app.status != status:
            continue
        yield {
            "loan_id": app.id,
            "realtor": app.realtor,
            "account_id": app.account_id,
            "status": app.status.value,
            "decision": app.decision.value if app.decision else "",
        }


def stream_csv(rows: Iterable[dict], fieldnames: Iterable[str]) -> Iterator[str]:
    """Stream CSV content from an iterable of rows."""
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    yield buffer.getvalue()
    buffer.seek(0)
    buffer.truncate(0)
    for row in rows:
        writer.writerow(row)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate(0)

