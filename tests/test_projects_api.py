import sys
sys.path.append('.')

from app.database import drop_db, init_db


def setup_function():
    drop_db()
    init_db()


def auth_headers(client, username: str):
    password = f"{username}Pass123"
    client.post(
        "/agents",
        json={"username": username, "role": "admin", "password": password},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    token = client.post(
        "/auth/login", json={"username": username, "password": password}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_project_and_stand_crud(client):
    headers = auth_headers(client, "admin")

    # create project
    project = {"name": "P"}
    resp = client.post("/projects", json=project, headers=headers)
    assert resp.status_code == 200
    project_id = resp.json()["id"]
    assert isinstance(project_id, int)

    # update project
    project_update = {"id": project_id, "name": "P2"}
    resp = client.put(f"/projects/{project_id}", json=project_update, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "P2"

    # create stand under project
    stand = {"project_id": project_id, "name": "S", "size": 10, "price": 100}
    resp = client.post(f"/projects/{project_id}/stands", json=stand, headers=headers)
    assert resp.status_code == 200
    stand_id = resp.json()["id"]
    assert isinstance(stand_id, int)

    # list stands
    resp = client.get(f"/projects/{project_id}/stands", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # update stand
    stand_update = {
        "id": stand_id,
        "project_id": project_id,
        "name": "S2",
        "size": 10,
        "price": 100,
    }
    resp = client.put(
        f"/projects/{project_id}/stands/{stand_id}",
        json=stand_update,
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "S2"

    # delete stand
    resp = client.delete(
        f"/projects/{project_id}/stands/{stand_id}", headers=headers
    )
    assert resp.status_code == 200

    # delete project
    resp = client.delete(f"/projects/{project_id}", headers=headers)
    assert resp.status_code == 200


def test_delete_project_with_existing_stands_rejected(client):
    headers = auth_headers(client, "admin")

    project = {"name": "P"}
    resp = client.post("/projects", json=project, headers=headers)
    assert resp.status_code == 200
    project_id = resp.json()["id"]

    stand = {"project_id": project_id, "name": "S", "size": 10, "price": 100}
    resp = client.post(f"/projects/{project_id}/stands", json=stand, headers=headers)
    assert resp.status_code == 200
    stand_id = resp.json()["id"]

    resp = client.delete(f"/projects/{project_id}", headers=headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Cannot delete project with existing stands"

    resp = client.get(f"/projects/{project_id}/stands", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
