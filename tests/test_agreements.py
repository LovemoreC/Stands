import sys
sys.path.append(".")

from app.models import PropertyStatus
from app.database import drop_db, init_db


def setup_data(client):
    reset_state()

    def create_and_login(username, role, headers=None):
        client.post(
            "/agents",
            json={"username": username, "role": role, "password": username},
            headers=headers,
        )
        token = client.post(
            "/auth/login", json={"username": username, "password": username}
        ).json()["token"]
        return {"Authorization": f"Bearer {token}"}

    admin_headers = create_and_login("admin", "admin")
    realtor_headers = create_and_login("realtor", "agent", admin_headers)
    intruder_headers = create_and_login("intruder", "agent", admin_headers)

    client.post("/projects", json={"id": 1, "name": "Proj"}, headers=admin_headers)
    client.post(
        "/stands",
        json={"id": 1, "project_id": 1, "name": "Stand1", "size": 100, "price": 1000},
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


def test_agreement_flow(client):
    admin_headers, realtor_headers, intruder_headers = setup_data(client)

    resp = client.post(
        "/agreements",
        json={"id": 1, "loan_application_id": 1, "property_id": 1},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Stand1" in data["document"]
    assert data["status"] == "draft"

    resp = client.get("/agreements/1", headers=intruder_headers)
    assert resp.status_code == 403

    resp = client.get("/agreements/1", headers=realtor_headers)
    assert resp.status_code == 200

    resp = client.get("/agreements/1", headers=admin_headers)
    assert resp.status_code == 200

    resp = client.get("/agreements/1/document", headers=admin_headers)
    assert resp.status_code == 200
    assert "Stand1" in resp.text

    resp = client.post(
        "/agreements/1/sign",
        json={"document_url": "url_intruder"},
        headers=intruder_headers,
    )
    assert resp.status_code == 403

    resp = client.post(
        "/agreements/1/sign",
        json={"document_url": "url_customer"},
        headers=realtor_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["customer_document_url"] == "url_customer"
    assert data["status"] == "partially_signed"

    resp = client.post(
        "/agreements/1/sign",
        json={"document_url": "url_bank"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["bank_document_url"] == "url_bank"
    assert data["status"] == "signed"

    notes_resp = client.get("/notifications", headers=admin_headers)
    assert any("Loan Accounts Opening Team" in n for n in notes_resp.json())

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Intrusion"},
        headers=intruder_headers,
    )
    assert resp.status_code == 403

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Updated by Realtor"},
        headers=realtor_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document"] == "Updated by Realtor"
    assert len(data["versions"]) == 2

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Updated by Admin"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document"] == "Updated by Admin"
    assert len(data["versions"]) == 3
    assert len(data["audit_log"]) >= 4

    resp = client.post(
        "/loan-accounts",
        json={"agreement_id": 1},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    account_number = resp.json()["account_number"]
    stand_resp = client.get("/stands/1", headers=admin_headers)
    assert stand_resp.json()["status"] == PropertyStatus.SOLD.value
    loan_resp = client.get("/loan-applications/1", headers=realtor_headers)
    assert loan_resp.json()["loan_account_number"] == account_number
    acct_resp = client.get("/loan-accounts/realtor", headers=admin_headers)
    assert acct_resp.json() == [account_number]

    resp = client.put(
        "/stands/1",
        json={
            "id": 1,
            "project_id": 1,
            "name": "New",
            "status": "available",
            "size": 100,
            "price": 1000,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 400
    reset_state()
