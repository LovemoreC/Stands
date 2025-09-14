import sys
sys.path.append(".")

from fastapi.testclient import TestClient
from app.main import app
from app.models import PropertyStatus
from app.database import drop_db, init_db

client = TestClient(app)


def setup_data():
    reset_state()
    def create_and_login(username, role):
        client.post(
            "/agents", json={"username": username, "role": role, "password": username}
        )
        token = client.post(
            "/login", json={"username": username, "password": username}
        ).json()["token"]
        return {"X-Token": token}

    admin_headers = create_and_login("admin", "admin")
    realtor_headers = create_and_login("realtor", "agent")
    intruder_headers = create_and_login("intruder", "agent")

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
    return admin_headers, realtor_headers, intruder_headers


def reset_state():
    drop_db()
    init_db()


def test_agreement_flow():
    admin_headers, realtor_headers, intruder_headers = setup_data()

    resp = client.post(
        "/agreements/generate",
        json={"id": 1, "loan_application_id": 1, "property_id": 1},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert "Stand1" in resp.json()["document"]

    resp = client.put("/agreements/1/sign", headers=intruder_headers)
    assert resp.status_code == 403

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

    resp = client.put(
        "/agreements/1/execute",
        json={"loan_account_number": "LN1"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    stand_resp = client.get("/stands/1", headers=admin_headers)
    assert stand_resp.json()["status"] == PropertyStatus.SOLD.value
    loan_resp = client.get("/loan-applications/1", headers=realtor_headers)
    assert loan_resp.json()["loan_account_number"] == "LN1"
    acct_resp = client.get("/loan-accounts/realtor", headers=admin_headers)
    assert acct_resp.json() == ["LN1"]
    notes_resp = client.get("/notifications", headers=admin_headers)
    assert any("Loan Accounts Opening Team" in n for n in notes_resp.json())

    resp = client.put(
        "/stands/1",
        json={"id": 1, "project_id": 1, "name": "New", "status": "available"},
        headers=admin_headers,
    )
    assert resp.status_code == 400
    reset_state()
