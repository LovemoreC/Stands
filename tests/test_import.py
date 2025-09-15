import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db

client = TestClient(app)


def setup_function():
    drop_db()
    init_db()
    client.post(
        "/agents", json={"username": "admin", "role": "admin", "password": "a"}
    )
    token = client.post(
        "/auth/login", json={"username": "admin", "password": "a"}
    ).json()["token"]
    global admin_headers
    admin_headers = {"Authorization": f"Bearer {token}"}


def test_import_csv_with_errors():
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
