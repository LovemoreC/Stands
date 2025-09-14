import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app
from app.database import drop_db, init_db

client = TestClient(app)


def setup_function():
    drop_db()
    init_db()


def test_unknown_role_rejected():
    resp = client.post("/agents", json={"username": "bad", "role": "ghost"})
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail and "Input should" in detail[0]["msg"]
