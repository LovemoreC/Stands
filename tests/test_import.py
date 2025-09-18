import sys
import sys
sys.path.append('.')

import pytest

from app.database import drop_db, init_db


@pytest.fixture()
def admin_headers(client):
    drop_db()
    init_db()
    client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "a"},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    token = client.post(
        "/auth/login", json={"username": "admin", "password": "a"}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_import_csv_with_errors(client, admin_headers):
    csv_content = (
        "project_id,project_name,stand_id,stand_name,size,price\n"
        "1,Proj,1,Stand1,100,1000\n"
        "2,,2,Stand2,100,\n"
    )
    resp = client.post(
        "/import/properties",
        files={"file": ("data.csv", csv_content, "text/csv")},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["imported"] == 1
    assert len(data["errors"]) == 1
    assert "Row 3" in data["errors"][0]

    resp = client.get("/stands/1", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Stand1"

    resp = client.get("/projects", headers=admin_headers)
    assert any(p["id"] == 1 for p in resp.json())
