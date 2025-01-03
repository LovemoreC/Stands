### `property_routes.py`
from flask import Blueprint, jsonify, request
from utils import create_response
from models import Project, Property
from extensions import db

property_bp = Blueprint("property", __name__)

@property_bp.route("/projects/<int:project_id>/properties", methods=["GET"])
def list_properties(project_id):
    """Endpoint for guests to view properties in a project."""
    try:
        # Query for the project
        project = Project.query.get(project_id)
        if not project:
            return create_response(error="Project not found.", status=404)

        # Query properties within the project
        properties = Property.query.filter_by(project_id=project_id).all()
        property_list = [
            {
                "id": prop.id,
                "name": prop.name,
                "description": prop.description,
                "price": prop.price,
                "location": prop.location,
                "availability": prop.availability
            }
            for prop in properties
        ]

        return create_response(data=property_list, message="Properties retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@property_bp.route("/properties/available", methods=["GET"])
def list_available_properties():
    """Endpoint for guests to view all available properties across projects."""
    try:
        properties = Property.query.filter_by(availability=True).all()
        property_list = [
            {
                "id": prop.id,
                "name": prop.name,
                "description": prop.description,
                "price": prop.price,
                "location": prop.location,
                "availability": prop.availability
            }
            for prop in properties
        ]

        return create_response(data=property_list, message="Available properties retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)
