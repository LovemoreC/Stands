import sys
import base64

sys.path.append('.')

from app.database import drop_db, init_db


def bootstrap_users(client):
    drop_db()
    init_db()
    admin_password = "AdminPass123"
    client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": admin_password},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": admin_password}
    ).json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    realtor_password = "RealtorPass123"
    client.post(
        "/agents",
        json={"username": "realtor", "role": "agent", "password": realtor_password},
        headers=admin_headers,
    )
    realtor_token = client.post(
        "/auth/login", json={"username": "realtor", "password": realtor_password}
    ).json()["token"]
    return admin_token, realtor_token


def test_requirement_crud_and_submission_validation(client):
    admin_token, realtor_token = bootstrap_users(client)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    realtor_headers = {"Authorization": f"Bearer {realtor_token}"}

    resp = client.post(
        "/document-requirements",
        json={"name": "Signed offer", "applies_to": "offer"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    requirement_one = resp.json()
    assert requirement_one["slug"] == "signed_offer"

    resp = client.post(
        "/document-requirements",
        json={"name": "Proof of funds", "applies_to": "offer"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    requirement_two = resp.json()
    assert requirement_two["slug"] == "proof_of_funds"

    resp = client.get(
        "/document-requirements",
        params={"applies_to": "offer"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    ids = [item["id"] for item in resp.json()]
    assert ids == [requirement_one["id"], requirement_two["id"]]

    resp = client.put(
        f"/document-requirements/{requirement_one['id']}",
        json={"name": "Updated offer"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated offer"

    resp = client.post(
        "/document-requirements/reorder",
        json={
            "applies_to": "offer",
            "ordered_ids": [requirement_two["id"], requirement_one["id"]],
        },
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert [item["id"] for item in resp.json()] == [
        requirement_two["id"],
        requirement_one["id"],
    ]

    resp = client.delete(
        f"/document-requirements/{requirement_two['id']}", headers=admin_headers
    )
    assert resp.status_code == 200

    resp = client.get(
        "/document-requirements",
        params={"applies_to": "offer"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1 and data[0]["id"] == requirement_one["id"]

    offer_payload = {"id": 99, "realtor": "realtor", "property_id": 5}
    resp = client.post("/offers", json=offer_payload, headers=realtor_headers)
    assert resp.status_code == 400
    assert "Missing required documents" in resp.json()["detail"]

    encoded = base64.b64encode(b"doc").decode()
    offer_payload["required_documents"] = {
        requirement_one["slug"]: {
            "filename": "offer.pdf",
            "content_type": "application/pdf",
            "content": encoded,
        }
    }
    resp = client.post("/offers", json=offer_payload, headers=realtor_headers)
    assert resp.status_code == 200
    assert requirement_one["slug"] in resp.json()["required_documents"]
