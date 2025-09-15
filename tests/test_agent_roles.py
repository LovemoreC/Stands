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
