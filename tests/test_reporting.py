import sys
import csv

sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db

client = TestClient(app)


def setup_function():
    drop_db()
    init_db()


def setup_data():
    client.post("/agents", json={"username": "admin", "role": "admin", "password": "a"})
    admin_token = client.post("/auth/login", json={"username": "admin", "password": "a"}).json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    client.post(
        "/agents",
        json={"username": "agent", "role": "agent", "password": "b"},
        headers=admin_headers,
    )
    agent_token = client.post("/auth/login", json={"username": "agent", "password": "b"}).json()["token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}
    client.post("/projects", json={"id": 1, "name": "Proj"}, headers=admin_headers)
    client.post(
        "/stands",
        json={"id": 1, "project_id": 1, "name": "S1", "size": 100, "price": 1000},
        headers=admin_headers,
    )
    client.post(
        "/stands",
        json={"id": 2, "project_id": 1, "name": "S2", "size": 100, "price": 2000, "status": "sold"},
        headers=admin_headers,
    )
    client.post("/stands/1/mandate", json={"agent": "agent"}, headers=admin_headers)
    client.put("/stands/1/mandate/accept", headers=agent_headers)
    client.post(
        "/account-openings",
        json={"id": 1, "realtor": "agent"},
        headers=agent_headers,
    )
    client.put(
        "/account-openings/1/open",
        json={"account_number": "A1", "deposit_threshold": 100},
        headers=admin_headers,
    )
    client.post(
        "/account-openings/1/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    client.post(
        "/loan-applications",
        json={"id": 1, "realtor": "agent", "account_id": 1, "documents": ["d"]},
        headers=agent_headers,
    )
    client.put(
        "/loan-applications/1/decision",
        json={"decision": "approved"},
        headers=admin_headers,
    )
    return admin_headers


def test_report_headers_and_rows():
    admin_headers = setup_data()
    resp = client.get("/reports/properties", headers=admin_headers)
    assert resp.status_code == 200
    lines = resp.text.strip().splitlines()
    assert (
        lines[0]
        == "project_id,project_name,stand_id,stand_name,price,status,mandate_status"
    )
    data = list(csv.DictReader(lines))
    assert len(data) == 2
    row = next(r for r in data if r["stand_id"] == "1")
    assert row["mandate_status"] == "accepted"


def test_report_filtering():
    admin_headers = setup_data()
    resp = client.get("/reports/properties?status=sold", headers=admin_headers)
    assert resp.status_code == 200
    data = list(csv.DictReader(resp.text.splitlines()))
    assert len(data) == 1
    assert data[0]["status"] == "sold"


def test_mandate_and_loan_reports():
    admin_headers = setup_data()
    resp = client.get("/reports/mandates", headers=admin_headers)
    assert resp.status_code == 200
    data = list(csv.DictReader(resp.text.splitlines()))
    assert data[0]["status"] == "accepted"

    resp = client.get("/reports/loans?status=completed", headers=admin_headers)
    assert resp.status_code == 200
    data = list(csv.DictReader(resp.text.splitlines()))
    assert data[0]["decision"] == "approved"
