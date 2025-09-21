from datetime import datetime

from app.database import SessionLocal, drop_db, init_db
from app.inbox import InboundEmail
from app.inbox_runner import InboundEmailProcessorRunner, run_processor_once
from app.repositories import Repositories


class DummyInboxClient:
    def __init__(self) -> None:
        self._messages = [
            InboundEmail(
                message_id="1",
                subject="Account update",
                body="Account Number: ACC-12345",
                received_at=datetime.utcnow(),
            )
        ]
        self.marked: list[str] = []

    def fetch_unread(self):
        messages = self._messages
        self._messages = []
        return messages

    def mark_processed(self, message_id: str) -> None:
        self.marked.append(message_id)


class IdleInboxClient(DummyInboxClient):
    def fetch_unread(self):
        return []


def test_run_processor_once_persists_profiles_and_marks_messages():
    drop_db()
    init_db()
    client = DummyInboxClient()

    processed = run_processor_once(client)

    assert processed == 1
    assert client.marked == ["1"]

    session = SessionLocal()
    try:
        repos = Repositories(session)
        profile = repos.customer_profiles.get("ACC-12345")
    finally:
        session.close()

    assert profile is not None
    assert profile.account_number == "ACC-12345"


def test_runner_waits_when_no_messages(monkeypatch):
    drop_db()
    init_db()
    client = IdleInboxClient()
    runner = InboundEmailProcessorRunner(client, interval_seconds=1)

    calls = []

    def fake_sleep(seconds):
        calls.append(seconds)
        runner.stop()

    monkeypatch.setattr("time.sleep", lambda seconds: fake_sleep(seconds))

    runner.run()

    assert calls  # ensures the loop waited before exiting
