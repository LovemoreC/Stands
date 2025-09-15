import os
import sys
sys.path.append('.')

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test")

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as c:
        yield c

