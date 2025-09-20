import sys
sys.path.append(".")

from app.models import PropertyStatus
from app.database import drop_db, init_db


def setup_data(client):
    reset_state()

    def create_and_login(username, role, headers=None):
        create_headers = headers or {"X-Bootstrap-Token": "bootstrap-token"}
        password = f"{username}Pass123"
        client.post(
            "/agents",
            json={"username": username, "role": role, "password": password},
            headers=create_headers,
        )
        token = client.post(
            "/auth/login", json={"username": username, "password": password}
        ).json()["token"]
        return {"Authorization": f"Bearer {token}"}

    admin_headers = create_and_login("admin", "admin")
    realtor_headers = create_and_login("realtor", "agent", admin_headers)
    intruder_headers = create_and_login("intruder", "agent", admin_headers)

    project_id = client.post(
        "/projects", json={"name": "Proj"}, headers=admin_headers
    ).json()["id"]
    stand_id = client.post(
        "/stands",
        json={"project_id": project_id, "name": "Stand1", "size": 100, "price": 1000},
        headers=admin_headers,
    ).json()["id"]

    client.post(
        "/account-openings",
        json={"id": 1, "realtor": "realtor"},
        headers=realtor_headers,
    )
    client.post(
        "/account-openings/1/approve",
        headers=admin_headers,
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
    property_application = {
        "id": 101,
        "realtor": "realtor",
        "property_id": stand_id,
    }
    client.post(
        "/property-applications",
        json=property_application,
        headers=realtor_headers,
    )
    client.post(
        f"/property-applications/{property_application['id']}/approve",
        headers=admin_headers,
    )
    client.post(
        "/loan-applications",
        json={
            "id": 1,
            "realtor": "realtor",
            "account_id": 1,
            "property_application_id": property_application["id"],
            "property_id": stand_id,
            "documents": ["doc"],
        },
        headers=realtor_headers,
    )
    return {
        "admin_headers": admin_headers,
        "realtor_headers": realtor_headers,
        "intruder_headers": intruder_headers,
        "project_id": project_id,
        "stand_id": stand_id,
    }


def reset_state():
    drop_db()
    init_db()


def test_agreement_flow(client):
    ctx = setup_data(client)

    resp = client.post(
        "/agreements",
        json={
            "id": 1,
            "loan_application_id": 1,
            "property_id": ctx["stand_id"],
        },
        headers=ctx["admin_headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Stand1" in data["document"]
    assert data["status"] == "draft"

    resp = client.get("/agreements/1", headers=ctx["intruder_headers"])
    assert resp.status_code == 403

    resp = client.get("/agreements/1", headers=ctx["realtor_headers"])
    assert resp.status_code == 200

    resp = client.get("/agreements/1", headers=ctx["admin_headers"])
    assert resp.status_code == 200

    resp = client.get("/agreements/1/document", headers=ctx["admin_headers"])
    assert resp.status_code == 200
    assert "Stand1" in resp.text

    resp = client.post(
        "/agreements/1/sign",
        json={"document_url": "url_intruder"},
        headers=ctx["intruder_headers"],
    )
    assert resp.status_code == 403

    resp = client.post(
        "/agreements/1/sign",
        json={"document_url": "url_customer"},
        headers=ctx["realtor_headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["customer_document_url"] == "url_customer"
    assert data["status"] == "partially_signed"

    resp = client.post(
        "/agreements/1/sign",
        json={"document_url": "url_bank"},
        headers=ctx["admin_headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["bank_document_url"] == "url_bank"
    assert data["status"] == "signed"

    notes_resp = client.get("/notifications", headers=ctx["admin_headers"])
    assert any("Loan Accounts Opening Team" in n for n in notes_resp.json())

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Intrusion"},
        headers=ctx["intruder_headers"],
    )
    assert resp.status_code == 403

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Updated by Realtor"},
        headers=ctx["realtor_headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document"] == "Updated by Realtor"
    assert len(data["versions"]) == 2

    resp = client.post(
        "/agreements/1/upload",
        json={"document": "Updated by Admin"},
        headers=ctx["admin_headers"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["document"] == "Updated by Admin"
    assert len(data["versions"]) == 3
    assert len(data["audit_log"]) >= 4

    resp = client.post(
        "/loan-accounts",
        json={"agreement_id": 1},
        headers=ctx["admin_headers"],
    )
    assert resp.status_code == 200
    account_number = resp.json()["account_number"]
    stand_resp = client.get(f"/stands/{ctx['stand_id']}", headers=ctx["admin_headers"])
    assert stand_resp.json()["status"] == PropertyStatus.SOLD.value
    loan_resp = client.get("/loan-applications/1", headers=ctx["realtor_headers"])
    assert loan_resp.json()["loan_account_number"] == account_number
    acct_resp = client.get(
        "/loan-accounts/realtor", headers=ctx["admin_headers"]
    )
    assert acct_resp.json() == [account_number]

    resp = client.put(
        f"/stands/{ctx['stand_id']}",
        json={
            "id": ctx["stand_id"],
            "project_id": ctx["project_id"],
            "name": "New",
            "status": "available",
            "size": 100,
            "price": 1000,
        },
        headers=ctx["admin_headers"],
    )
    assert resp.status_code == 400
    reset_state()
