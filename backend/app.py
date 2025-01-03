from flask import Flask, request, jsonify
from flask_swagger_ui import get_swaggerui_blueprint
from config import Config
from extensions import db, jwt, socketio, migrate
from routes import register_routes
from commands import register_commands
from error_handling import register_error_handlers
import os
import logging
from logging_config import setup_logging

# Swagger configuration
SWAGGER_URL = '/api/docs'
API_URL = '/static/swagger.json'  # URL to the Swagger JSON file

swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,  # Swagger UI endpoint
    API_URL,  # Swagger JSON URL
    config={
        'app_name': "Stands Admin App"
    }
)

def create_app():
    """Factory function to create the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Setup logging
    logger = setup_logging()
    logger.info("Starting the application")

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app)
    migrate.init_app(app, db)

    # Register routes
    register_routes(app)

    # Register CLI commands
    register_commands(app)

    # Register error handlers
    register_error_handlers(app)

    # Register Swagger UI
    app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

    @app.before_request
    def log_request_info():
        """Log request details for debugging purposes."""
        app.logger.debug(f"Request: {request.method} {request.url}")
        app.logger.debug(f"Headers: {request.headers}")
        app.logger.debug(f"Body: {request.get_data(as_text=True)}")

    @app.after_request
    def log_response_info(response):
        """Log response details for debugging purposes."""
        app.logger.debug(f"Response status: {response.status}")
        app.logger.debug(f"Response data: {response.get_data(as_text=True)}")
        return response

    @app.errorhandler(400)
    def bad_request_error(error):
        """Handle 400 errors with a custom response."""
        return jsonify({"error": "Bad request", "status": 400}), 400

    @app.errorhandler(401)
    def unauthorized_error(error):
        """Handle 401 Unauthorized errors."""
        return jsonify({"error": "Unauthorized", "status": 401}), 401

    @app.errorhandler(403)
    def forbidden_error(error):
        """Handle 403 Forbidden errors."""
        return jsonify({"error": "Forbidden", "status": 403}), 403

    @app.errorhandler(404)
    def not_found_error(error):
        """Handle 404 errors with a custom response."""
        return jsonify({"error": "Resource not found", "status": 404}), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 errors with a custom response."""
        app.logger.error(f"Server error: {error}")
        return jsonify({"error": "Internal server error", "status": 500}), 500

    return app

app = create_app()

if __name__ == "__main__":
    # Ensure upload directory exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    with app.app_context():
        db.create_all()

    app.logger.info("Application started and running")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
