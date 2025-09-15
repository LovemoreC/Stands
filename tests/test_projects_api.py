import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db

client = TestClient(app)


def setup_function():
    drop_db()
    init_db()


def auth_headers(username: str):
    client.post(
        "/agents",
        json={"username": username, "role": "admin", "password": username},
    )
    token = client.post(
        "/auth/login", json={"username": username, "password": username}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_project_and_stand_crud():
    headers = auth_headers("admin")

    # create project
    project = {"id": 1, "name": "P"}
    resp = client.post("/projects", json=project, headers=headers)
    assert resp.status_code == 200

    # update project
    project_update = {"id": 1, "name": "P2"}
    resp = client.put("/projects/1", json=project_update, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "P2"

    # create stand under project
    stand = {"id": 10, "project_id": 1, "name": "S", "size": 10, "price": 100}
    resp = client.post("/projects/1/stands", json=stand, headers=headers)
    assert resp.status_code == 200

    # list stands
    resp = client.get("/projects/1/stands", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # update stand
    stand_update = {"id": 10, "project_id": 1, "name": "S2", "size": 10, "price": 100}
    resp = client.put("/projects/1/stands/10", json=stand_update, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "S2"

    # delete stand
    resp = client.delete("/projects/1/stands/10", headers=headers)
    assert resp.status_code == 200

    # delete project
    resp = client.delete("/projects/1", headers=headers)
    assert resp.status_code == 200
