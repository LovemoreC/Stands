import sys
sys.path.append(".")

from app.models import PropertyStatus
from app.database import drop_db, init_db


def setup_function():
    drop_db()
    init_db()


def test_auth_mandate_and_available_view(client):
    # register agents
    admin_password = "AdminPass123"
    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": admin_password},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    assert resp.status_code == 200
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": admin_password}
    ).json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    agent_password = "AgentPass123"
    resp = client.post(
        "/agents",
        json={"username": "agentA", "role": "agent", "password": agent_password},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    agent_token = client.post(
        "/auth/login", json={"username": "agentA", "password": agent_password}
    ).json()["token"]

    agent_headers = {"Authorization": f"Bearer {agent_token}"}

    # Create project as admin
    project = {"name": "Project A"}
    resp = client.post("/projects", json=project, headers=admin_headers)
    assert resp.status_code == 200
    project_id = resp.json()["id"]

    # Create stand as admin
    stand = {"project_id": project_id, "name": "Stand 1", "size": 100, "price": 1000}
    resp = client.post("/stands", json=stand, headers=admin_headers)
    assert resp.status_code == 200
    stand_id = resp.json()["id"]

    # Agent cannot create stand
    resp = client.post(
        "/stands",
        json={
            "project_id": project_id,
            "name": "Stand 2",
            "size": 100,
            "price": 1000,
        },
        headers=agent_headers,
    )
    assert resp.status_code == 403

    # Update stand as admin
    stand_update = {
        "id": stand_id,
        "project_id": project_id,
        "name": "Stand 1 Updated",
        "status": "available",
        "size": 100,
        "price": 1000,
    }
    resp = client.put(f"/stands/{stand_id}", json=stand_update, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Stand 1 Updated"

    # Assign mandate with document
    resp = client.post(
        f"/stands/{stand_id}/mandate",
        json={"agent": "agentA", "document": "doc.pdf"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["mandate"]["status"] == "pending"

    # Agent accepts mandate
    resp = client.put(f"/stands/{stand_id}/mandate/accept", headers=agent_headers)
    assert resp.status_code == 200
    assert resp.json()["mandate"]["status"] == "accepted"

    # Available stands for agent (filtered by mandate)
    resp = client.get("/stands/available", headers=agent_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Available stands for admin (all available)
    resp = client.get("/stands/available", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Archive stand
    resp = client.delete(f"/stands/{stand_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == PropertyStatus.ARCHIVED.value

