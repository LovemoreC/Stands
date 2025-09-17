import os
import sys
sys.path.append('.')

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("INITIAL_ADMIN_TOKEN", "bootstrap-token")

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as c:
        yield c

