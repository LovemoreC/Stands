import sys

sys.path.append(".")

from fastapi.testclient import TestClient
from app.main import app
from app.models import PropertyStatus

client = TestClient(app)


def test_create_update_archive_and_mandate():
    # Create project
    project = {"id": 1, "name": "Project A"}
    resp = client.post("/projects", json=project)
    assert resp.status_code == 200
    # Create stand
    stand = {"id": 1, "project_id": 1, "name": "Stand 1"}
    resp = client.post("/stands", json=stand)
    assert resp.status_code == 200
    # Update stand
    stand_update = {"id": 1, "project_id": 1, "name": "Stand 1", "status": "reserved"}
    resp = client.put("/stands/1", json=stand_update)
    assert resp.status_code == 200
    assert resp.json()["status"] == PropertyStatus.RESERVED.value
    # Assign mandate
    resp = client.post("/stands/1/mandate", json={"agent": "Agent A"})
    assert resp.status_code == 200
    assert resp.json()["mandate_agent"] == "Agent A"
    # Archive stand
    resp = client.delete("/stands/1")
    assert resp.status_code == 200
    assert resp.json()["status"] == PropertyStatus.ARCHIVED.value
