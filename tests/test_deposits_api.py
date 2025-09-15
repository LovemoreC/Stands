from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db

client = TestClient(app)

def setup_function(_):
    drop_db()
    init_db()

def register_users():
    client.post("/agents", json={"username": "admin", "role": "admin", "password": "admin"})
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": "admin"}
    ).json()["token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    client.post(
        "/agents",
        json={"username": "agent", "role": "agent", "password": "agent"},
        headers=headers,
    )
    agent_token = client.post(
        "/auth/login", json={"username": "agent", "password": "agent"}
    ).json()["token"]
    return {"admin": admin_token, "agent": agent_token}

def test_deposit_workflow():
    tokens = register_users()
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    agent_headers = {"Authorization": f"Bearer {tokens['agent']}"}

    # Agent submits account opening
    client.post("/account-openings", json={"id": 1, "realtor": "agent"}, headers=agent_headers)

    # Pending deposits should list the submission
    resp = client.get("/accounts/deposits/pending", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == "submitted"

    # Open account via deposits endpoint
    resp = client.post(
        "/accounts/deposits/1/open",
        json={"account_number": "A1", "deposit_threshold": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"

    # Record deposit reaching threshold
    resp = client.post(
        "/accounts/deposits/1/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["deposits"] == [100]

    # Completed request should not appear in pending list
    resp = client.get("/accounts/deposits/pending", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json() == []
