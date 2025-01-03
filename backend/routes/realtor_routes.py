### `realtor_routes.py`
from flask import Blueprint, jsonify, request
from utils import create_response
from schemas.reservation_schema import ReservationSchema
from schemas.user_schema import UserSchema
from models import User, Property, db
from extensions import socketio
from marshmallow.exceptions import ValidationError

realtor_bp = Blueprint("realtor", __name__)

@realtor_bp.route("/dashboard", methods=["GET"])
def realtor_dashboard():
    """Realtor dashboard route."""
    try:
        # Simulate fetching realtor-specific data
        dashboard_data = {
            "total_reservations": 10,
            "pending_reservations": 2,
            "approved_reservations": 8
        }
        return create_response(data=dashboard_data, message="Realtor dashboard data retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@realtor_bp.route("/reservations", methods=["POST"])
def create_reservation():
    """Endpoint to create a reservation."""
    data = request.json

    # Validate input using ReservationSchema
    schema = ReservationSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        return create_response(error=err.messages, status=400)

    # Simulate reservation creation
    property_id = validated_data.get("property_id")
    property_ = Property.query.get(property_id)
    if not property_ or not property_.availability:
        return create_response(error="Property not available for reservation.", status=400)

    property_.availability = False  # Mark property as reserved
    db.session.commit()

    # Emit a real-time notification
    socketio.emit("reservation_created", {
        "property_id": property_id,
        "realtor_id": validated_data.get("realtor_id"),
        "customer_name": validated_data.get("customer_name"),
        "reservation_date": validated_data.get("reservation_date")
    })

    return create_response(data=validated_data, message="Reservation created successfully.", status=201)

@realtor_bp.route("/reservations/<int:reservation_id>", methods=["DELETE"])
def delete_reservation(reservation_id):
    """Endpoint to delete a reservation."""
    try:
        # Simulate deletion logic
        reservation = Property.query.get(reservation_id)
        if not reservation:
            return create_response(error="Reservation not found.", status=404)

        reservation.availability = True  # Revert property to available
        db.session.commit()

        # Emit a real-time notification
        socketio.emit("reservation_deleted", {
            "reservation_id": reservation_id
        })

        return create_response(message=f"Reservation {reservation_id} deleted successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@realtor_bp.route("/sub-realtors", methods=["POST"])
def create_sub_realtor():
    """Endpoint for a master realtor to create a sub-realtor."""
    data = request.json

    # Validate input using UserSchema
    schema = UserSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        return create_response(error=err.messages, status=400)

    # Set role to 'realtor' and link to the master realtor
    master_realtor_id = request.headers.get("Master-Realtor-ID")
    if not master_realtor_id:
        return create_response(error="Master Realtor ID is required.", status=400)

    master_realtor = User.query.get(master_realtor_id)
    if not master_realtor or master_realtor.role != "master_realtor":
        return create_response(error="Invalid Master Realtor ID.", status=400)

    new_realtor = User(**validated_data, role="realtor", parent_id=master_realtor.id)
    db.session.add(new_realtor)
    db.session.commit()

    return create_response(data={"id": new_realtor.id, "username": new_realtor.username}, message="Sub-realtor created successfully.", status=201)

@realtor_bp.route("/sub-realtors", methods=["GET"])
def list_sub_realtors():
    """Endpoint for a master realtor to view their sub-realtors."""
    master_realtor_id = request.headers.get("Master-Realtor-ID")
    if not master_realtor_id:
        return create_response(error="Master Realtor ID is required.", status=400)

    master_realtor = User.query.get(master_realtor_id)
    if not master_realtor or master_realtor.role != "master_realtor":
        return create_response(error="Invalid Master Realtor ID.", status=400)

    sub_realtors = User.query.filter_by(parent_id=master_realtor.id).all()
    realtor_list = [{"id": realtor.id, "username": realtor.username} for realtor in sub_realtors]

    return create_response(data=realtor_list, message="Sub-realtors retrieved successfully.")
