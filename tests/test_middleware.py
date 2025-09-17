import sys
from typing import Set

sys.path.append('.')

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.database import Record, drop_db, init_db
from app.main import app


@app.get("/middleware-error")
def trigger_middleware_error():
    raise RuntimeError("boom")


def test_log_request_failure_records_audit_and_closes_session(monkeypatch):
    from app import main

    drop_db()
    init_db()

    open_sessions: Set[Session] = set()

    class TrackingSession(Session):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            open_sessions.add(self)

        def close(self) -> None:  # type: ignore[override]
            try:
                super().close()
            finally:
                open_sessions.discard(self)

    original_session_local = main.SessionLocal
    tracking_session_local = sessionmaker(class_=TrackingSession, **original_session_local.kw)
    monkeypatch.setattr(main, "SessionLocal", tracking_session_local)

    with TestClient(app, raise_server_exceptions=False) as client:
        session = tracking_session_local()
        try:
            session.query(Record).filter_by(store="audit_log").delete()
            session.commit()
        finally:
            session.close()

        response = client.get("/middleware-error")
        assert response.status_code == 500

        session = tracking_session_local()
        try:
            entries = [row.data for row in session.query(Record).filter_by(store="audit_log").all()]
        finally:
            session.close()

        failure_entries = [entry for entry in entries if "/middleware-error" in entry]
        assert failure_entries, "Expected middleware failure to be recorded in audit log"
        assert failure_entries[-1].endswith("500"), failure_entries[-1]

    assert not open_sessions, "Middleware session should be closed after request"

