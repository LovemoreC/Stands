import sys

sys.path.append(".")

from app.models import SubmissionStatus
from app.database import drop_db, init_db


def setup_agents(client):
    drop_db()
    init_db()
    client.post(
        "/agents", json={"username": "admin", "role": "admin", "password": "a"}
    )
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": "a"}
    ).json()["token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    client.post(
        "/agents",
        json={"username": "realtor", "role": "agent", "password": "b"},
        headers=headers,
    )
    realtor_token = client.post(
        "/auth/login", json={"username": "realtor", "password": "b"}
    ).json()["token"]
    return {"admin": admin_token, "realtor": realtor_token}


def test_submissions_and_status_updates(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

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


def test_submission_payload_privileged_fields_are_sanitized(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

    offer_payload = {
        "id": 101,
        "realtor": "realtor",
        "property_id": 1,
        "status": SubmissionStatus.COMPLETED.value,
    }
    resp = client.post("/offers", json=offer_payload, headers=realtor_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.SUBMITTED.value
    resp = client.get("/offers/101", headers=realtor_headers)
    assert resp.json()["status"] == SubmissionStatus.SUBMITTED.value

    application_payload = {
        "id": 202,
        "realtor": "realtor",
        "property_id": 2,
        "status": SubmissionStatus.COMPLETED.value,
    }
    resp = client.post(
        "/property-applications", json=application_payload, headers=realtor_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.SUBMITTED.value
    resp = client.get("/property-applications/202", headers=realtor_headers)
    assert resp.json()["status"] == SubmissionStatus.SUBMITTED.value

    account_payload = {
        "id": 303,
        "realtor": "realtor",
        "status": SubmissionStatus.COMPLETED.value,
        "account_number": "MAL123",
        "deposit_threshold": 9999,
        "deposits": [100, 200],
    }
    resp = client.post("/account-openings", json=account_payload, headers=realtor_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == SubmissionStatus.SUBMITTED.value
    assert body["account_number"] is None
    assert body["deposit_threshold"] is None
    assert body["deposits"] == []
    resp = client.get("/account-openings/303", headers=realtor_headers)
    stored = resp.json()
    assert stored["status"] == SubmissionStatus.SUBMITTED.value
    assert stored["account_number"] is None
    assert stored["deposit_threshold"] is None
    assert stored["deposits"] == []

    resp = client.put(
        "/account-openings/303/open",
        json={"account_number": "SAFE", "deposit_threshold": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    resp = client.post(
        "/account-openings/303/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    loan_app_payload = {
        "id": 404,
        "realtor": "realtor",
        "account_id": 303,
        "documents": ["doc"],
        "status": SubmissionStatus.COMPLETED.value,
        "decision": "approved",
        "reason": "sensitive",
        "loan_account_number": "MAL456",
    }
    resp = client.post(
        "/loan-applications", json=loan_app_payload, headers=realtor_headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == SubmissionStatus.SUBMITTED.value
    assert body["decision"] is None
    assert body["reason"] is None
    assert body["loan_account_number"] is None
    resp = client.get("/loan-applications/404", headers=realtor_headers)
    stored = resp.json()
    assert stored["status"] == SubmissionStatus.SUBMITTED.value
    assert stored["decision"] is None
    assert stored["reason"] is None
    assert stored["loan_account_number"] is None


def test_account_opening_deposit_tracking(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

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


def test_loan_application_flow(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

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


def test_loan_application_realtor_mismatch_rejected(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

    # Realtor submits and completes an account opening
    account = {"id": 7, "realtor": "realtor"}
    resp = client.post("/account-openings", json=account, headers=realtor_headers)
    assert resp.status_code == 200

    resp = client.put(
        "/account-openings/7/open",
        json={"account_number": "AC7", "deposit_threshold": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    resp = client.post(
        "/account-openings/7/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    # Another agent attempts to submit a loan application using this account
    resp = client.post(
        "/agents",
        json={"username": "other", "role": "agent", "password": "c"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    other_token = client.post(
        "/auth/login", json={"username": "other", "password": "c"}
    ).json()["token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    loan_app = {
        "id": 99,
        "realtor": "other",
        "account_id": 7,
        "documents": ["doc"],
    }
    resp = client.post("/loan-applications", json=loan_app, headers=other_headers)
    assert resp.status_code == 403


def test_account_opening_queue_listing(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

    client.post(
        "/account-openings",
        json={"id": 10, "realtor": "realtor"},
        headers=realtor_headers,
    )
    client.post(
        "/account-openings",
        json={"id": 20, "realtor": "realtor"},
        headers=realtor_headers,
    )
    client.put(
        "/account-openings/10/open",
        json={"account_number": "ACC10", "deposit_threshold": 100},
        headers=admin_headers,
    )

    resp = client.get(
        "/account-openings",
        params={"status": SubmissionStatus.SUBMITTED.value},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == 20

    resp = client.get("/account-openings", headers=admin_headers)
    assert resp.status_code == 200
    ids = {r["id"] for r in resp.json()}
    assert ids == {10, 20}


def test_loan_application_queue_listing_and_agreement_generation(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

    client.post("/projects", json={"id": 1, "name": "P"}, headers=admin_headers)
    client.post(
        "/stands",
        json={"id": 1, "project_id": 1, "name": "S", "size": 100, "price": 1000},
        headers=admin_headers,
    )

    client.post(
        "/account-openings",
        json={"id": 1, "realtor": "realtor"},
        headers=realtor_headers,
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

    loan_app = {
        "id": 10,
        "realtor": "realtor",
        "account_id": 1,
        "documents": ["doc"],
        "property_id": 1,
    }
    client.post("/loan-applications", json=loan_app, headers=realtor_headers)

    resp = client.get(
        "/loan-applications",
        params={"status": SubmissionStatus.SUBMITTED.value},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1 and data[0]["id"] == 10

    resp = client.put(
        "/loan-applications/10/decision",
        json={"decision": "approved", "reason": "ok"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == SubmissionStatus.COMPLETED.value

    resp = client.get("/agreements/10", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["loan_application_id"] == 10
