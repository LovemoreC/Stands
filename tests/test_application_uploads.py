import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db

client = TestClient(app)


def setup_agents():
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


def test_upload_applications():
    tokens = setup_agents()
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
