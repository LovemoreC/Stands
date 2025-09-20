import os
import sys
sys.path.append('.')

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("INITIAL_ADMIN_TOKEN", "bootstrap-token")
os.environ.setdefault("DEPOSIT_ACCOUNTS_EMAIL", "deposits@example.com")
os.environ.setdefault("MAIL_PROVIDER", "console")
os.environ.setdefault("MAIL_FROM_ADDRESS", "noreply@example.com")

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as c:
        yield c

