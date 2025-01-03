import pytest
from flask import Flask
from app import create_app
from extensions import db

@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    with app.app_context():
        db.create_all()
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

# Test Admin Dashboard
def test_admin_dashboard(client):
    response = client.get("/admin/dashboard")
    assert response.status_code == 200
    assert response.json["message"] == "Admin dashboard data retrieved successfully."

# Test Manager Dashboard
def test_manager_dashboard(client):
    response = client.get("/manager/dashboard")
    assert response.status_code == 200
    assert response.json["message"] == "Manager dashboard data retrieved successfully."

# Test Customer Dashboard
def test_customer_dashboard(client):
    response = client.get("/customer/dashboard?email=test@example.com")
    assert response.status_code == 200
    assert "data" in response.json
    assert response.json["message"] == "Customer dashboard data retrieved successfully."

# Test Realtor Dashboard
def test_realtor_dashboard(client):
    response = client.get("/realtor/dashboard")
    assert response.status_code == 200
    assert "data" in response.json
    assert response.json["message"] == "Realtor dashboard data retrieved successfully."

# Test Payment Submission
def test_submit_payment(client):
    payload = {"application_id": 1, "amount": 1500.0}
    response = client.post("/payments/submit", json=payload)
    assert response.status_code == 201
    assert "data" in response.json
    assert response.json["message"] == "Payment submitted successfully."

# Test Payment Review
def test_review_payment(client):
    payload = {"status": "approved"}
    response = client.put("/payments/1/review", json=payload)
    assert response.status_code == 200
    assert "data" in response.json
    assert response.json["message"] == "Payment approved successfully."

# Test Payment History
def test_payment_history(client):
    # Simulate a valid application ID
    application_id = 1

    # Add some mock payment data for the application
    mock_payments = [
        {"id": 1, "application_id": application_id, "amount": 1500.0, "status": "approved", "payment_date": "2023-01-20"},
        {"id": 2, "application_id": application_id, "amount": 2000.0, "status": "pending", "payment_date": "2023-01-25"}
    ]

    # Simulate retrieving payment history
    response = client.get(f"/payments/history/{application_id}")

    assert response.status_code == 200
    assert "data" in response.json
    assert response.json["message"] == "Payment history retrieved successfully."
    assert len(response.json["data"]) == len(mock_payments)

    for mock_payment, response_payment in zip(mock_payments, response.json["data"]):
        assert mock_payment["id"] == response_payment["id"]
        assert mock_payment["amount"] == response_payment["amount"]
        assert mock_payment["status"] == response_payment["status"]
