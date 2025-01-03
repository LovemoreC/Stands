from flask import Flask
from .admin_routes import admin_bp
from .manager_routes import manager_bp
from .realtor_routes import realtor_bp
from .customer_routes import customer_bp
from .payment_routes import payment_bp

def register_routes(app: Flask):
    """Register all route blueprints with the Flask application."""
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(manager_bp, url_prefix="/manager")
    app.register_blueprint(realtor_bp, url_prefix="/realtor")
    app.register_blueprint(customer_bp, url_prefix="/customer")
    app.register_blueprint(payment_bp, url_prefix="/payments")
