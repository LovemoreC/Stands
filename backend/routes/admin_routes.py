### `admin_routes.py`
from flask import Blueprint, jsonify, request
from utils import create_response
from schemas.user_schema import UserSchema
from models import User, db
from marshmallow.exceptions import ValidationError

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/dashboard", methods=["GET"])
def admin_dashboard():
    """Admin dashboard route."""
    try:
        # Simulate fetching dashboard data
        dashboard_data = {
            "total_users": 100,
            "total_projects": 50,
            "total_properties": 300,
            "total_payments": 1200
        }
        return create_response(data=dashboard_data, message="Admin dashboard data retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@admin_bp.route("/properties", methods=["POST"])
def create_property():
    """Endpoint to create a property."""
    data = request.json

    # Validate input using PropertySchema
    schema = PropertySchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        return create_response(error=err.messages, status=400)

    # Simulate saving the property
    new_property = {
        "id": 1,
        **validated_data
    }

    return create_response(data=new_property, message="Property created successfully.", status=201)

@admin_bp.route("/properties/<int:property_id>", methods=["DELETE"])
def delete_property(property_id):
    """Endpoint to delete a property."""
    try:
        # Simulate deletion logic
        if property_id != 1:  # Simulate property not found
            return create_response(error="Property not found.", status=404)

        return create_response(message=f"Property {property_id} deleted successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@admin_bp.route("/users", methods=["POST"])
def create_user():
    """Endpoint to create a user (manager or master realtor)."""
    data = request.json

    # Validate input using UserSchema
    schema = UserSchema()
    try:
        validated_data = schema.load(data)
    except ValidationError as err:
        return create_response(error=err.messages, status=400)

    # Create and save user
    new_user = User(**validated_data)
    db.session.add(new_user)
    db.session.commit()

    return create_response(data={"id": new_user.id, "role": new_user.role}, message="User created successfully.", status=201)

@admin_bp.route("/users", methods=["GET"])
def list_users():
    """Endpoint to list all managers and master realtors."""
    try:
        users = User.query.filter(User.role.in_(["manager", "master_realtor"])).all()
        user_list = [{"id": user.id, "username": user.username, "role": user.role} for user in users]
        return create_response(data=user_list, message="Users retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)
