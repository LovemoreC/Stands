import csv
import sys
sys.path.append('.')

from app.database import drop_db, init_db


def setup_function():
    drop_db()
    init_db()


def setup_data(client):
    client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "a"},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    admin_token = client.post("/auth/login", json={"username": "admin", "password": "a"}).json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    client.post(
        "/agents",
        json={"username": "agent", "role": "agent", "password": "b"},
        headers=admin_headers,
    )
    agent_token = client.post("/auth/login", json={"username": "agent", "password": "b"}).json()["token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}
    project_id = client.post(
        "/projects", json={"name": "Proj"}, headers=admin_headers
    ).json()["id"]
    stand_one = client.post(
        "/stands",
        json={"project_id": project_id, "name": "S1", "size": 100, "price": 1000},
        headers=admin_headers,
    ).json()
    stand_two = client.post(
        "/stands",
        json={
            "project_id": project_id,
            "name": "S2",
            "size": 100,
            "price": 2000,
            "status": "sold",
        },
        headers=admin_headers,
    ).json()
    client.post(
        f"/stands/{stand_one['id']}/mandate",
        json={"agent": "agent"},
        headers=admin_headers,
    )
    client.put(f"/stands/{stand_one['id']}/mandate/accept", headers=agent_headers)
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
    return {
        "admin_headers": admin_headers,
        "agent_headers": agent_headers,
        "project_id": project_id,
        "stand_ids": [stand_one["id"], stand_two["id"]],
    }


def test_report_headers_and_rows(client):
    ctx = setup_data(client)
    resp = client.get("/reports/properties", headers=ctx["admin_headers"])
    assert resp.status_code == 200
    lines = resp.text.strip().splitlines()
    assert (
        lines[0]
        == "project_id,project_name,stand_id,stand_name,price,status,mandate_status"
    )
    data = list(csv.DictReader(lines))
    assert len(data) == 2
    row = next(r for r in data if r["stand_id"] == str(ctx["stand_ids"][0]))
    assert row["mandate_status"] == "accepted"


def test_report_filtering(client):
    ctx = setup_data(client)
    resp = client.get(
        "/reports/properties?status=sold", headers=ctx["admin_headers"]
    )
    assert resp.status_code == 200
    data = list(csv.DictReader(resp.text.splitlines()))
    assert len(data) == 1
    assert data[0]["status"] == "sold"


def test_mandate_and_loan_reports(client):
    ctx = setup_data(client)
    resp = client.get("/reports/mandates", headers=ctx["admin_headers"])
    assert resp.status_code == 200
    data = list(csv.DictReader(resp.text.splitlines()))
    assert data[0]["status"] == "accepted"

    resp = client.get(
        "/reports/loans?status=completed", headers=ctx["admin_headers"]
    )
    assert resp.status_code == 200
    data = list(csv.DictReader(resp.text.splitlines()))
    assert data[0]["decision"] == "approved"
