import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_unknown_role_rejected():
    resp = client.post("/agents", json={"username": "bad", "role": "ghost"})
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail and "Input should" in detail[0]["msg"]
