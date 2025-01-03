from flask import Blueprint, jsonify, request
from utils import create_response

manager_bp = Blueprint("manager", __name__)

@manager_bp.route("/dashboard", methods=["GET"])
def manager_dashboard():
    """Manager dashboard route."""
    try:
        # Simulate fetching dashboard data
        dashboard_data = {
            "projects": [
                {"id": 1, "name": "Project A", "total_properties": 100, "available_properties": 20},
                {"id": 2, "name": "Project B", "total_properties": 50, "available_properties": 10}
            ],
            "total_revenue": 1000000.0
        }
        return create_response(data=dashboard_data, message="Manager dashboard data retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@manager_bp.route("/projects/<int:project_id>/analytics", methods=["GET"])
def project_analytics(project_id):
    """Fetch analytics for a specific project."""
    try:
        # Simulate fetching project analytics
        if project_id not in [1, 2]:
            return create_response(error="Project not found.", status=404)

        analytics_data = {
            "project_id": project_id,
            "revenue": 500000.0,
            "total_properties": 100,
            "available_properties": 20,
            "sold_properties": 80
        }
        return create_response(data=analytics_data, message="Project analytics retrieved successfully.")
    except Exception as e:
        return create_response(error=str(e), status=500)
