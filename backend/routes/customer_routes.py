from flask import Blueprint, request
from utils import create_response

customer_bp = Blueprint("customer", __name__)

@customer_bp.route("/dashboard", methods=["GET"])
def customer_dashboard():
    """Customer dashboard route."""
    email = request.args.get("email")
    if not email:
        return create_response(error="Email is required to retrieve dashboard data.", status=400)

    try:
        # Simulate fetching dashboard data
        dashboard_data = {
            "applications": [
                {"id": 1, "property_id": 101, "status": "pending", "submitted_at": "2023-01-01"},
                {"id": 2, "property_id": 102, "status": "approved", "submitted_at": "2023-01-15"}
            ],
            "payments": [
                {"id": 1, "amount": 1500.0, "status": "approved", "payment_date": "2023-01-20"}
            ]
        }
        return create_response(data=dashboard_data, message="Customer dashboard data retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@customer_bp.route("/applications/<int:application_id>", methods=["GET"])
def get_application_details(application_id):
    """Retrieve details of a specific application."""
    try:
        # Simulate fetching application details
        if application_id not in [1, 2]:
            return create_response(error="Application not found.", status=404)

        application_details = {
            "id": application_id,
            "property_id": 101,
            "customer_name": "John Doe",
            "status": "approved",
            "submitted_at": "2023-01-15"
        }
        return create_response(data=application_details, message="Application details retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@customer_bp.route("/payments/<int:payment_id>", methods=["GET"])
def get_payment_details(payment_id):
    """Retrieve details of a specific payment."""
    try:
        # Simulate fetching payment details
        if payment_id not in [1, 2]:
            return create_response(error="Payment not found.", status=404)

        payment_details = {
            "id": payment_id,
            "amount": 1500.0,
            "status": "approved",
            "payment_date": "2023-01-20"
        }
        return create_response(data=payment_details, message="Payment details retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)
