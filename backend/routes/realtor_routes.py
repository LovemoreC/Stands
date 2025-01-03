from flask import Blueprint, jsonify, request
from utils import create_response

realtor_bp = Blueprint("realtor", __name__)

@realtor_bp.route("/dashboard", methods=["GET"])
def realtor_dashboard():
    """Realtor dashboard route."""
    try:
        # Simulate fetching dashboard data
        dashboard_data = {
            "reservations": [
                {"id": 1, "property_id": 101, "status": "reserved", "reservation_expiry": "2023-02-01"},
                {"id": 2, "property_id": 102, "status": "reserved", "reservation_expiry": "2023-02-05"}
            ],
            "applications": [
                {"id": 1, "property_id": 101, "status": "approved", "submitted_at": "2023-01-15"},
                {"id": 2, "property_id": 102, "status": "pending", "submitted_at": "2023-01-20"}
            ],
            "payments": [
                {"id": 1, "amount": 2000.0, "status": "approved", "payment_date": "2023-01-25"}
            ]
        }
        return create_response(data=dashboard_data, message="Realtor dashboard data retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@realtor_bp.route("/reservations", methods=["POST"])
def create_reservation():
    """Create a reservation for a property."""
    data = request.json

    # Validate input
    if not data or "property_id" not in data or "customer_id" not in data:
        return create_response(error="Missing required fields: property_id, customer_id", status=400)

    try:
        # Simulate reservation creation
        new_reservation = {
            "id": 3,
            "property_id": data["property_id"],
            "customer_id": data["customer_id"],
            "status": "reserved",
            "reservation_expiry": "2023-02-10"
        }
        return create_response(data=new_reservation, message="Reservation created successfully.", status=201)
    except Exception as e:
        return create_response(error=str(e), status=500)

@realtor_bp.route("/reservations/<int:reservation_id>", methods=["DELETE"])
def delete_reservation(reservation_id):
    """Delete a reservation."""
    try:
        # Simulate reservation deletion
        if reservation_id not in [1, 2]:
            return create_response(error="Reservation not found.", status=404)

        return create_response(message=f"Reservation {reservation_id} deleted successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)
