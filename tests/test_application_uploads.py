import sys
sys.path.append('.')

from app.database import drop_db, init_db


def setup_agents(client):
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
    headers = {"Authorization": f"Bearer {admin_token}"}
    realtor_password = "RealtorPass123"
    client.post(
        "/agents",
        json={"username": "realtor", "role": "agent", "password": realtor_password},
        headers=headers,
    )
    realtor_token = client.post(
        "/auth/login", json={"username": "realtor", "password": realtor_password}
    ).json()["token"]
    return {"admin": admin_token, "realtor": realtor_token}


def test_upload_applications(client):
    tokens = setup_agents(client)
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

    files = {"file": ("offer.pdf", b"data", "application/pdf")}
    data = {"id": "1", "realtor": "realtor", "property_id": "1"}
    resp = client.post(
        "/applications/offer", data=data, files=files, headers=realtor_headers
    )
    assert resp.status_code == 200
    assert resp.json()["document"]["filename"] == "offer.pdf"
    assert resp.json()["document"]["content"]

    files = {"file": ("prop.pdf", b"data", "application/pdf")}
    data = {"id": "1", "realtor": "realtor", "property_id": "2"}
    resp = client.post(
        "/applications/property", data=data, files=files, headers=realtor_headers
    )
    assert resp.status_code == 200
    assert resp.json()["document"]["filename"] == "prop.pdf"

    files = {"file": ("acc.pdf", b"data", "application/pdf")}
    data = {"id": "1", "realtor": "realtor"}
    resp = client.post(
        "/applications/account", data=data, files=files, headers=realtor_headers
    )
    assert resp.status_code == 200
    assert resp.json()["document"]["filename"] == "acc.pdf"


def test_missing_required_document_is_rejected(client):
    tokens = setup_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    realtor_headers = {"Authorization": f"Bearer {tokens['realtor']}"}

    requirement = client.post(
        "/document-requirements",
        json={"name": "Government ID", "applies_to": "property_application"},
        headers=admin_headers,
    ).json()

    base_files = {"file": ("prop.pdf", b"data", "application/pdf")}
    data = {"id": "55", "realtor": "realtor", "property_id": "9"}

    resp = client.post(
        "/applications/property",
        data=data,
        files=base_files,
        headers=realtor_headers,
    )
    assert resp.status_code == 400
    assert "Missing required documents" in resp.json()["detail"]

    files = {
        "file": ("prop.pdf", b"data", "application/pdf"),
        requirement["slug"]: ("id.pdf", b"identity", "application/pdf"),
    }
    resp = client.post(
        "/applications/property",
        data=data,
        files=files,
        headers=realtor_headers,
    )
    assert resp.status_code == 200
