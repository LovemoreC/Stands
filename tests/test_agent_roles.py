import sys
sys.path.append('.')

from app.database import drop_db, init_db


def setup_function():
    drop_db()
    init_db()


def test_unknown_role_rejected(client):
    resp = client.post(
        "/agents", json={"username": "bad", "role": "ghost", "password": "x"}
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail and "Input should" in detail[0]["msg"]


def test_first_agent_without_bootstrap_token_fails(client):
    resp = client.post(
        "/agents", json={"username": "admin", "role": "admin", "password": "secret"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing bootstrap token"


def test_bootstrap_token_allows_first_admin_then_admin_can_create_more(client):
    from app.main import INITIAL_ADMIN_TOKEN

    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "secret"},
        headers={"X-Bootstrap-Token": INITIAL_ADMIN_TOKEN},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"

    login = client.post(
        "/auth/login", json={"username": "admin", "password": "secret"}
    )
    assert login.status_code == 200
    token = login.json()["token"]

    resp = client.post(
        "/agents",
        json={"username": "agent2", "role": "compliance", "password": "secret"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["username"] == "agent2"
    assert payload["role"] == "compliance"
