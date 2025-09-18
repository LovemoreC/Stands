import sys
sys.path.append('.')

from app.database import drop_db, init_db


def setup_function():
    drop_db()
    init_db()


def test_unknown_role_rejected(client):
    resp = client.post(
        "/agents", json={"username": "bad", "role": "ghost", "password": "ValidPass1"}
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail and "Input should" in detail[0]["msg"]


def test_password_policy_enforced(client):
    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "short"},
        headers={"X-Bootstrap-Token": "does-not-matter"},
    )
    assert resp.status_code == 422

    from app.main import INITIAL_ADMIN_TOKEN

    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "        "},
        headers={"X-Bootstrap-Token": INITIAL_ADMIN_TOKEN},
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Password does not meet requirements"


def test_first_agent_without_bootstrap_token_fails(client):
    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "Secret123"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing bootstrap token"


def test_bootstrap_token_allows_first_admin_then_admin_can_create_more(client):
    from app.main import INITIAL_ADMIN_TOKEN

    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "Secret123"},
        headers={"X-Bootstrap-Token": INITIAL_ADMIN_TOKEN},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"

    login = client.post(
        "/auth/login", json={"username": "admin", "password": "Secret123"}
    )
    assert login.status_code == 200
    token = login.json()["token"]

    resp = client.post(
        "/agents",
        json={"username": "agent2", "role": "compliance", "password": "Secret123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["username"] == "agent2"
    assert payload["role"] == "compliance"


def test_list_agents_requires_admin_and_returns_agents(client):
    from app.main import INITIAL_ADMIN_TOKEN

    create_admin = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": "Secret123"},
        headers={"X-Bootstrap-Token": INITIAL_ADMIN_TOKEN},
    )
    assert create_admin.status_code == 200

    admin_login = client.post(
        "/auth/login", json={"username": "admin", "password": "Secret123"}
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["token"]

    create_agent = client.post(
        "/agents",
        json={"username": "agent2", "role": "agent", "password": "Secret123"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_agent.status_code == 200

    agent_login = client.post(
        "/auth/login", json={"username": "agent2", "password": "Secret123"}
    )
    assert agent_login.status_code == 200
    agent_token = agent_login.json()["token"]

    list_resp = client.get(
        "/agents", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_resp.status_code == 200
    usernames = {agent["username"] for agent in list_resp.json()}
    assert {"admin", "agent2"}.issubset(usernames)

    forbidden = client.get(
        "/agents", headers={"Authorization": f"Bearer {agent_token}"}
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["detail"] == "Admin privileges required"
