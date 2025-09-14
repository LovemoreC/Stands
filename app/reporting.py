from io import StringIO
import csv
from typing import Optional

from .repositories import Repositories
from .models import PropertyStatus


def generate_properties_report(
    repos: Repositories, status: Optional[PropertyStatus] = None
) -> str:
    """Generate CSV report of properties and mandates."""
    projects = {p.id: p.name for p in repos.projects.list()}
    rows = []
    for stand in repos.stands.list():
        if status and stand.status != status:
            continue
        rows.append(
            {
                "project_id": stand.project_id,
                "project_name": projects.get(stand.project_id, ""),
                "stand_id": stand.id,
                "stand_name": stand.name,
                "price": stand.price,
                "status": stand.status.value,
                "mandate_status": stand.mandate.status.value if stand.mandate else "",
            }
        )
    output = StringIO()
    fieldnames = [
        "project_id",
        "project_name",
        "stand_id",
        "stand_name",
        "price",
        "status",
        "mandate_status",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()
