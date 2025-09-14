import sys
sys.path.append(".")

from fastapi.testclient import TestClient
from app.main import app
from app.models import SubmissionStatus

client = TestClient(app)


def setup_agents():
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
