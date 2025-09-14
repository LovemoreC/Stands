import sys
sys.path.append(".")

from fastapi.testclient import TestClient
from app.main import (
    app,
    projects,
    stands,
    agents,
    offers,
    applications,
    account_openings,
    loan_applications,
    notifications,
    agreements,
)

client = TestClient(app)


def setup_data():
    reset_state()
    client.post("/agents", json={"username": "admin", "role": "admin"})
    client.post("/agents", json={"username": "realtor", "role": "agent"})

    admin_headers = {"X-Token": "admin"}
    realtor_headers = {"X-Token": "realtor"}

    client.post("/projects", json={"id": 1, "name": "Proj"}, headers=admin_headers)
    client.post(
        "/stands",
        json={"id": 1, "project_id": 1, "name": "Stand1"},
        headers=admin_headers,
    )

    client.post(
        "/account-openings",
        json={"id": 1, "realtor": "realtor"},
        headers=realtor_headers,
    )
    client.put(
        "/account-openings/1/open",
        json={"account_number": "ACC1", "deposit_threshold": 100},
        headers=admin_headers,
    )
    client.post(
        "/account-openings/1/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    client.post(
        "/loan-applications",
        json={"id": 1, "realtor": "realtor", "account_id": 1, "documents": ["doc"]},
        headers=realtor_headers,
    )
    return admin_headers, realtor_headers


def reset_state():
    projects.clear()
    stands.clear()
    agents.clear()
    offers.clear()
    applications.clear()
    account_openings.clear()
    loan_applications.clear()
    notifications.clear()
    agreements.clear()


def test_agreement_flow():
    admin_headers, realtor_headers = setup_data()

    resp = client.post(
        "/agreements/generate",
        json={"id": 1, "loan_application_id": 1, "property_id": 1},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert "Stand1" in resp.json()["document"]

    resp = client.put("/agreements/1/sign", headers=realtor_headers)
    assert resp.status_code == 200
    assert resp.json()["customer_signature"] is not None

    resp = client.put("/agreements/1/sign", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["bank_signature"] is not None

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Updated"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document"] == "Updated"
    assert len(data["versions"]) == 2
    assert len(data["audit_log"]) >= 3
    reset_state()
