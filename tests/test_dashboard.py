import sys
sys.path.append('.')

from app.database import drop_db, init_db


def reset_state():
    drop_db()
    init_db()


def register_agents(client):
    creds = {
        "admin": "admin",
        "manager": "manager",
        "compliance": "compliance",
        "agentA": "agent",
    }
    passwords = {user: f"{user}Pass123" for user in creds}
    tokens = {}
    # create first admin
    client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": passwords["admin"]},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": passwords["admin"]}
    ).json()["token"]
    tokens["admin"] = admin_token
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    for user, role in list(creds.items())[1:]:
        client.post(
            "/agents",
            json={"username": user, "role": role, "password": passwords[user]},
            headers=admin_headers,
        )
        token = client.post(
            "/auth/login", json={"username": user, "password": passwords[user]}
        ).json()["token"]
        tokens[user] = token
    return tokens


def setup_data(client, admin_headers, agent_headers):
    project = {"name": "Proj"}
    project_id = client.post("/projects", json=project, headers=admin_headers).json()["id"]
    stand = {
        "project_id": project_id,
        "name": "Stand1",
        "size": 100,
        "price": 1000,
    }
    stand_id = client.post("/stands", json=stand, headers=admin_headers).json()["id"]
    client.post(
        f"/stands/{stand_id}/mandate",
        json={"agent": "agentA", "document": "m.pdf"},
        headers=admin_headers,
    )
    client.put(f"/stands/{stand_id}/mandate/accept", headers=agent_headers)
    client.post(
        "/account-openings",
        json={"id": 100, "realtor": "agentA"},
        headers=agent_headers,
    )
    client.put(
        "/account-openings/100/open",
        json={"account_number": "A1", "deposit_threshold": 100},
        headers=admin_headers,
    )
    client.post(
        "/account-openings/100/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    client.post(
        "/loan-applications",
        json={
            "id": 100,
            "realtor": "agentA",
            "account_id": 100,
            "documents": ["doc"],
        },
        headers=agent_headers,
    )
    client.put(
        "/loan-applications/100/decision",
        json={"decision": "approved"},
        headers=admin_headers,
    )


def test_dashboards_and_audit_log(client):
    reset_state()
    tokens = register_agents(client)
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    manager_headers = {"Authorization": f"Bearer {tokens['manager']}"}
    compliance_headers = {"Authorization": f"Bearer {tokens['compliance']}"}
    agent_headers = {"Authorization": f"Bearer {tokens['agentA']}"}

    setup_data(client, admin_headers, agent_headers)

    resp = client.get("/dashboard", headers=manager_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["property_status"]["available"] == 1
    assert data["mandates"]["accepted"] == 1
    assert "deposits" not in data

    resp = client.get("/dashboard", headers=compliance_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["deposits"] == 100
    assert data["loan_approvals"]["approved"] == 1
    assert "property_status" not in data

    resp = client.get("/audit-log", headers=compliance_headers)
    assert resp.status_code == 200
    log = resp.json()
    assert any(entry["action"].endswith("/projects") for entry in log)

    resp = client.get(
        "/audit-log", headers=compliance_headers, params={"user": "admin"}
    )
    assert resp.status_code == 200
    filtered = resp.json()
    assert all(entry["user"] == "admin" for entry in filtered)
    reset_state()

