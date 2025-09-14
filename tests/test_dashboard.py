import sys
sys.path.append('.')

from fastapi.testclient import TestClient
from app.main import (
    app,
    projects,
    stands,
    agents,
    offers,
    applications,
    account_openings,
    loan_applications,
    notifications,
    agreements,
    customer_loan_accounts,
    audit_log,
)

client = TestClient(app)


def reset_state():
    projects.clear()
    stands.clear()
    agents.clear()
    offers.clear()
    applications.clear()
    account_openings.clear()
    loan_applications.clear()
    notifications.clear()
    agreements.clear()
    customer_loan_accounts.clear()
    audit_log.clear()


def register_agents():
    client.post("/agents", json={"username": "admin", "role": "admin"})
    client.post("/agents", json={"username": "manager", "role": "manager"})
    client.post("/agents", json={"username": "compliance", "role": "compliance"})
    client.post("/agents", json={"username": "agentA", "role": "agent"})


def setup_data(admin_headers, agent_headers):
    project = {"id": 100, "name": "Proj"}
    client.post("/projects", json=project, headers=admin_headers)
    stand = {"id": 100, "project_id": 100, "name": "Stand1"}
    client.post("/stands", json=stand, headers=admin_headers)
    client.post(
        "/stands/100/mandate",
        json={"agent": "agentA", "document": "m.pdf"},
        headers=admin_headers,
    )
    client.put("/stands/100/mandate/accept", headers=agent_headers)
    client.post(
        "/account-openings",
        json={"id": 100, "realtor": "agentA"},
        headers=agent_headers,
    )
    client.put(
        "/account-openings/100/open",
        json={"account_number": "A1", "deposit_threshold": 100},
        headers=admin_headers,
    )
    client.post(
        "/account-openings/100/deposit",
        json={"amount": 100},
        headers=admin_headers,
    )
    client.post(
        "/loan-applications",
        json={
            "id": 100,
            "realtor": "agentA",
            "account_id": 100,
            "documents": ["doc"],
        },
        headers=agent_headers,
    )
    client.put(
        "/loan-applications/100/decision",
        json={"decision": "approved"},
        headers=admin_headers,
    )


def test_dashboards_and_audit_log():
    reset_state()
    register_agents()
    admin_headers = {"X-Token": "admin"}
    manager_headers = {"X-Token": "manager"}
    compliance_headers = {"X-Token": "compliance"}
    agent_headers = {"X-Token": "agentA"}

    setup_data(admin_headers, agent_headers)

    resp = client.get("/dashboard", headers=manager_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["property_status"]["available"] == 1
    assert data["mandates"]["accepted"] == 1
    assert "deposits" not in data

    resp = client.get("/dashboard", headers=compliance_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["deposits"] == 100
    assert data["loan_approvals"]["approved"] == 1
    assert "property_status" not in data

    resp = client.get("/audit-log", headers=compliance_headers)
    assert resp.status_code == 200
    log = resp.json()
    assert any("/projects" in entry for entry in log)
    reset_state()

