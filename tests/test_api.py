import sys

sys.path.append(".")

from fastapi.testclient import TestClient
from app.main import app
from app.models import PropertyStatus
from app.database import drop_db, init_db

client = TestClient(app)


def setup_function():
    drop_db()
    init_db()


def test_auth_mandate_and_available_view():
    # register agents
    resp = client.post("/agents", json={"username": "admin", "role": "admin"})
    assert resp.status_code == 200
    resp = client.post("/agents", json={"username": "agentA", "role": "agent"})
    assert resp.status_code == 200

    admin_headers = {"X-Token": "admin"}
    agent_headers = {"X-Token": "agentA"}

    # Create project as admin
    project = {"id": 1, "name": "Project A"}
    resp = client.post("/projects", json=project, headers=admin_headers)
    assert resp.status_code == 200

    # Create stand as admin
    stand = {"id": 1, "project_id": 1, "name": "Stand 1"}
    resp = client.post("/stands", json=stand, headers=admin_headers)
    assert resp.status_code == 200

    # Agent cannot create stand
    resp = client.post("/stands", json={"id": 2, "project_id": 1, "name": "Stand 2"}, headers=agent_headers)
    assert resp.status_code == 403

    # Update stand as admin
    stand_update = {"id": 1, "project_id": 1, "name": "Stand 1 Updated", "status": "available"}
    resp = client.put("/stands/1", json=stand_update, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Stand 1 Updated"

    # Assign mandate with document
    resp = client.post("/stands/1/mandate", json={"agent": "agentA", "document": "doc.pdf"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["mandate"]["status"] == "pending"

    # Agent accepts mandate
    resp = client.put("/stands/1/mandate/accept", headers=agent_headers)
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
    resp = client.delete("/stands/1", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == PropertyStatus.ARCHIVED.value

