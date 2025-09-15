import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db
from app.models import LoanStatus

client = TestClient(app)


def setup_agents():
    drop_db()
    init_db()
    client.post(
        "/agents", json={"username": "admin", "role": "admin", "password": "a"}
    )
    client.post(
        "/agents", json={"username": "user", "role": "agent", "password": "b"}
    )
    admin_token = client.post(
        "/login", json={"username": "admin", "password": "a"}
    ).json()["token"]
    user_token = client.post(
        "/login", json={"username": "user", "password": "b"}
    ).json()["token"]
    return {"admin": admin_token, "user": user_token}


def test_loan_flow():
    tokens = setup_agents()
    admin_headers = {"X-Token": tokens["admin"]}
    user_headers = {"X-Token": tokens["user"]}

    loan = {"id": 1, "borrower": "user", "amount": 1000}
    resp = client.post("/loans", json=loan, headers=user_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == LoanStatus.SUBMITTED.value

    resp = client.get("/loans/pending", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == LoanStatus.UNDER_REVIEW.value

    resp = client.post(
        "/loans/1/decision",
        json={"decision": "approved"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == LoanStatus.APPROVED.value

    loan2 = {"id": 2, "borrower": "user", "amount": 500}
    client.post("/loans", json=loan2, headers=user_headers)
    client.get("/loans/pending", headers=admin_headers)
    resp = client.post(
        "/loans/2/decision",
        json={"decision": "rejected", "reason": "No credit"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == LoanStatus.REJECTED.value
    assert resp.json()["reason"] == "No credit"
