from datetime import datetime

from app.database import drop_db, init_db, SessionLocal
from app.inbox import InboundEmail, InboundEmailProcessor
from app.models import (
    AccountOpening,
    Agreement,
    AgreementStatus,
    LoanApplication,
    SubmissionStatus,
)
from app.repositories import Repositories


def setup_function():
    drop_db()
    init_db()


def _bootstrap_agents(client):
    admin_password = "AdminPass123"
    resp = client.post(
        "/agents",
        json={"username": "admin", "role": "admin", "password": admin_password},
        headers={"X-Bootstrap-Token": "bootstrap-token"},
    )
    assert resp.status_code == 200
    admin_token = client.post(
        "/auth/login", json={"username": "admin", "password": admin_password}
    ).json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    agent_password = "AgentPass123"
    resp = client.post(
        "/agents",
        json={"username": "agentA", "role": "agent", "password": agent_password},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    agent_token = client.post(
        "/auth/login", json={"username": "agentA", "password": agent_password}
    ).json()["token"]
    agent_headers = {"Authorization": f"Bearer {agent_token}"}
    return admin_headers, agent_headers


def _create_project_and_stand(client, admin_headers):
    project_resp = client.post(
        "/projects",
        json={"name": "Project One", "description": ""},
        headers=admin_headers,
    )
    assert project_resp.status_code == 200
    project_id = project_resp.json()["id"]
    stand_resp = client.post(
        "/stands",
        json={
            "project_id": project_id,
            "name": "Stand 1",
            "size": 100,
            "price": 200000,
        },
        headers=admin_headers,
    )
    assert stand_resp.status_code == 200
    return stand_resp.json()["id"]


def test_profile_workflow_and_deletion(client):
    admin_headers, agent_headers = _bootstrap_agents(client)
    stand_id = _create_project_and_stand(client, admin_headers)

    account_payload = {
        "id": 1,
        "realtor": "agentA",
        "details": "Primary account",
        "required_documents": {},
    }
    resp = client.post(
        "/account-openings", json=account_payload, headers=agent_headers
    )
    assert resp.status_code == 200

    resp = client.post(
        "/account-openings/1/approve", headers=admin_headers
    )
    assert resp.status_code == 200

    resp = client.post(
        "/accounts/deposits/1/open",
        json={"account_number": "ACCT-123", "deposit_threshold": 1000},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    resp = client.post(
        "/accounts/deposits/1/deposit",
        json={"amount": 1000},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    loan_payload = {
        "id": 77,
        "realtor": "agentA",
        "account_id": 1,
        "property_id": stand_id,
        "required_documents": {},
    }
    resp = client.post(
        "/loan-applications", json=loan_payload, headers=agent_headers
    )
    assert resp.status_code == 200

    resp = client.post(
        "/agreements",
        json={"id": 55, "loan_application_id": 77, "property_id": stand_id},
        headers=admin_headers,
    )
    assert resp.status_code == 200

    profile_resp = client.get(
        "/profiles/ACCT-123",
        headers=agent_headers,
    )
    assert profile_resp.status_code == 200
    profile = profile_resp.json()
    assert profile["account_opening_id"] == 1
    assert profile["loan_application_ids"] == [77]
    assert profile["agreement_ids"] == [55]
    assert profile["deletion_requested"] is False

    delete_request = client.post(
        "/profiles/ACCT-123/request-deletion",
        headers=agent_headers,
    )
    assert delete_request.status_code == 200
    payload = delete_request.json()
    assert payload["deletion_requested"] is True
    assert payload["deletion_requested_by"] == "agentA"
    assert payload["deletion_requested_at"] is not None

    delete_resp = client.delete(
        "/profiles/ACCT-123", headers=admin_headers
    )
    assert delete_resp.status_code == 204

    missing_resp = client.get(
        "/profiles/ACCT-123",
        headers=admin_headers,
    )
    assert missing_resp.status_code == 404


class _DummyInboxClient:
    def __init__(self, messages):
        self._messages = messages
        self.marked = []

    def fetch_unread(self):
        return list(self._messages)

    def mark_processed(self, message_id: str) -> None:
        self.marked.append(message_id)


def test_inbound_email_processor_creates_profile():
    session = SessionLocal()
    try:
        repos = Repositories(session)
        account = AccountOpening(
            id=1,
            realtor="agentA",
            details="",
            status=SubmissionStatus.COMPLETED,
            account_number="EMAIL123",
            deposit_threshold=1000,
            deposits=[1000],
            document=None,
            required_documents={},
        )
        repos.account_openings.add(account)
        loan = LoanApplication(
            id=9,
            realtor="agentA",
            account_id=1,
            property_id=None,
            required_documents={},
            status=SubmissionStatus.SUBMITTED,
            decision=None,
            reason=None,
            loan_account_number=None,
        )
        repos.loan_applications.add(loan)
        agreement = Agreement(
            id=5,
            loan_application_id=9,
            property_id=1,
            realtor="agentA",
            document="doc",
            versions=["doc"],
            bank_document_url=None,
            customer_document_url=None,
            status=AgreementStatus.DRAFT,
            audit_log=[],
        )
        repos.agreements.add(agreement)

        received_at = datetime.utcnow()
        message = InboundEmail(
            message_id="1",
            subject="Reply",
            body="Account Number: EMAIL123",
            received_at=received_at,
        )
        client = _DummyInboxClient([message])
        processor = InboundEmailProcessor(repos, client)
        processed = processor.process_new_messages()
        assert processed == 1
        profile = repos.customer_profiles.get("EMAIL123")
        assert profile is not None
        assert profile.account_opening_id == 1
        assert profile.loan_application_ids == [9]
        assert profile.agreement_ids == [5]
        assert profile.last_inbound_email_at == received_at
        assert client.marked == ["1"]
    finally:
        session.close()
