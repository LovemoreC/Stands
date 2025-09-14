import sys
sys.path.append(".")

from fastapi.testclient import TestClient
from app.main import app
from app.models import SubmissionStatus
from app.database import drop_db, init_db

client = TestClient(app)


def setup_agents():
    drop_db()
    init_db()
    client.post("/agents", json={"username": "admin", "role": "admin"})
    client.post("/agents", json={"username": "realtor", "role": "agent"})


def test_submissions_and_status_updates():
    setup_agents()
    admin_headers = {"X-Token": "admin"}
    realtor_headers = {"X-Token": "realtor"}

    # Submit offer
    offer = {"id": 1, "realtor": "realtor", "property_id": 1}
    resp = client.post("/offers", json=offer, headers=realtor_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.SUBMITTED.value

    # Submit property application
    application = {"id": 1, "realtor": "realtor", "property_id": 1}
    resp = client.post("/property-applications", json=application, headers=realtor_headers)
    assert resp.status_code == 200

    # Submit account opening
    account = {"id": 1, "realtor": "realtor"}
    resp = client.post("/account-openings", json=account, headers=realtor_headers)
    assert resp.status_code == 200

    # Notifications should include all three submissions
    resp = client.get("/notifications", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 3

    # Admin updates status
    resp = client.put(
        "/offers/1/status",
        json={"status": SubmissionStatus.IN_PROGRESS.value},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Realtor retrieves updated offer
    resp = client.get("/offers/1", headers=realtor_headers)
    assert resp.json()["status"] == SubmissionStatus.IN_PROGRESS.value

    # Admin completes account opening
    resp = client.put(
        "/account-openings/1/status",
        json={"status": SubmissionStatus.COMPLETED.value},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Realtor checks account opening status
    resp = client.get("/account-openings/1", headers=realtor_headers)
    assert resp.json()["status"] == SubmissionStatus.COMPLETED.value


def test_account_opening_deposit_tracking():
    setup_agents()
    admin_headers = {"X-Token": "admin"}
    realtor_headers = {"X-Token": "realtor"}

    account = {"id": 2, "realtor": "realtor"}
    resp = client.post("/account-openings", json=account, headers=realtor_headers)
    assert resp.status_code == 200

    resp = client.put(
        "/account-openings/2/open",
        json={"account_number": "ACC123", "deposit_threshold": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["account_number"] == "ACC123"
    assert resp.json()["status"] == SubmissionStatus.IN_PROGRESS.value

    resp = client.post(
        "/account-openings/2/deposit",
        json={"amount": 40},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.IN_PROGRESS.value

    resp = client.post(
        "/account-openings/2/deposit",
        json={"amount": 60},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.COMPLETED.value


def test_loan_application_flow():
    setup_agents()
    admin_headers = {"X-Token": "admin"}
    realtor_headers = {"X-Token": "realtor"}

    account = {"id": 3, "realtor": "realtor"}
    resp = client.post("/account-openings", json=account, headers=realtor_headers)
    assert resp.status_code == 200

    resp = client.put(
        "/account-openings/3/open",
        json={"account_number": "ACC3", "deposit_threshold": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    resp = client.post(
        "/account-openings/3/deposit",
        json={"amount": 50},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    loan_app = {"id": 1, "realtor": "realtor", "account_id": 3, "documents": ["doc"]}
    resp = client.post("/loan-applications", json=loan_app, headers=realtor_headers)
    assert resp.status_code == 400

    resp = client.post(
        "/account-openings/3/deposit",
        json={"amount": 50},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    loan_app_no_docs = {
        "id": 1,
        "realtor": "realtor",
        "account_id": 3,
        "documents": [],
    }
    resp = client.post(
        "/loan-applications", json=loan_app_no_docs, headers=realtor_headers
    )
    assert resp.status_code == 400

    resp = client.post(
        "/loan-applications",
        json={"id": 1, "realtor": "realtor", "account_id": 3, "documents": ["doc"]},
        headers=realtor_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.SUBMITTED.value

    resp = client.put(
        "/loan-applications/1/decision",
        json={"decision": "approved", "reason": "All good"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.COMPLETED.value
    assert resp.json()["decision"] == "approved"
    assert resp.json()["reason"] == "All good"

    resp = client.post(
        "/loan-applications",
        json={"id": 2, "realtor": "realtor", "account_id": 3, "documents": ["doc2"]},
        headers=realtor_headers,
    )
    assert resp.status_code == 200

    resp = client.put(
        "/loan-applications/2/decision",
        json={"decision": "rejected", "reason": "Insufficient credit"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.REJECTED.value
    assert resp.json()["decision"] == "rejected"
    assert resp.json()["reason"] == "Insufficient credit"
