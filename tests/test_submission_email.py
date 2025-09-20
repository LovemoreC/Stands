import base64
import pytest

from app.database import drop_db, init_db
from app.mailer import EmailSendError, set_mailer_for_testing


class StubMailer:
    def __init__(self) -> None:
        self.sent_requests = []

    def send(self, request) -> None:
        self.sent_requests.append(request)


@pytest.fixture()
def mailer_stub():
    stub = StubMailer()
    set_mailer_for_testing(stub)
    try:
        yield stub
    finally:
        set_mailer_for_testing(None)


def setup_agents(client):
    drop_db()
    init_db()
    admin_password = "AdminPass123"
    client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": admin_password},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": admin_password}
    ).json()["token"]
    realtor_password = "RealtorPass123"
    client.post(
        "/agents",
        json={"username": "realtor", "role": "agent", "password": realtor_password},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    realtor_token = client.post(
        "/auth/login", json={"username": "realtor", "password": realtor_password}
    ).json()["token"]
    return {
        "admin": {"Authorization": f"Bearer {admin_token}"},
        "realtor": {"Authorization": f"Bearer {realtor_token}"},
    }


def test_offer_submission_dispatches_email(client, mailer_stub):
    headers = setup_agents(client)
    resp = client.post(
        "/contact-settings/deposit",
        json={"recipients": ["deposits-team@example.com"]},
        headers=headers["admin"],
    )
    assert resp.status_code == 200
    requirement = client.post(
        "/document-requirements",
        json={"name": "Proof of funds", "applies_to": "offer"},
        headers=headers["admin"],
    ).json()
    encoded_document = base64.b64encode(b"offer document").decode()
    encoded_requirement = base64.b64encode(b"supporting document").decode()
    payload = {
        "id": 601,
        "realtor": "realtor",
        "property_id": 42,
        "details": "New offer",
        "document": {
            "filename": "offer.pdf",
            "content_type": "application/pdf",
            "content": encoded_document,
        },
        "required_documents": {
            requirement["slug"]: {
                "filename": "proof.pdf",
                "content_type": "application/pdf",
                "content": encoded_requirement,
            }
        },
    }

    resp = client.post("/offers", json=payload, headers=headers["realtor"])
    assert resp.status_code == 200

    assert len(mailer_stub.sent_requests) == 1
    request = mailer_stub.sent_requests[0]
    assert request.subject == "Offer submission #601"
    assert "Submission Type: Offer" in request.body
    assert len(request.attachments) == 2
    filenames = {attachment.filename for attachment in request.attachments}
    assert filenames == {"offer.pdf", "proof.pdf"}
    assert list(request.to) == ["deposits-team@example.com"]


def test_account_opening_upload_dispatches_email(client, mailer_stub):
    headers = setup_agents(client)
    requirement = client.post(
        "/document-requirements",
        json={"name": "Government ID", "applies_to": "account_opening"},
        headers=headers["admin"],
    ).json()
    data = {
        "id": "777",
        "realtor": "realtor",
        "details": "Open account",
    }
    files = {
        "file": ("statement.pdf", b"statement", "application/pdf"),
        requirement["slug"]: ("id.pdf", b"id-doc", "application/pdf"),
    }

    resp = client.post(
        "/applications/account",
        data=data,
        files=files,
        headers=headers["realtor"],
    )
    assert resp.status_code == 200

    assert len(mailer_stub.sent_requests) == 0

    resp = client.post(
        "/applications/account/777/approve",
        headers=headers["admin"],
    )
    assert resp.status_code == 200

    assert len(mailer_stub.sent_requests) == 1
    request = mailer_stub.sent_requests[0]
    assert request.subject == "Account opening #777"
    assert "Submission Type: Account Opening" in request.body
    assert len(request.attachments) == 2
    filenames = {attachment.filename for attachment in request.attachments}
    assert filenames == {"statement.pdf", "id.pdf"}


def test_email_failure_is_reported_to_notifications(client):
    headers = setup_agents(client)

    class FailingMailer:
        def send(self, request) -> None:  # pragma: no cover - simple stub
            raise EmailSendError("smtp failure")

    set_mailer_for_testing(FailingMailer())
    try:
        payload = {
            "id": 888,
            "realtor": "realtor",
            "property_id": 11,
        }
        resp = client.post("/offers", json=payload, headers=headers["realtor"])
        assert resp.status_code == 200

        notes_resp = client.get("/notifications", headers=headers["admin"])
        assert notes_resp.status_code == 200
        notes = notes_resp.json()
        assert any("Email delivery failed for Offer submission #888" in note for note in notes)
    finally:
        set_mailer_for_testing(None)
