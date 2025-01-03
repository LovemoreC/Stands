from flask import Blueprint, request, jsonify
from extensions import db, jwt
from utils import create_response
from models import User
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from functools import wraps

user_bp = Blueprint("user", __name__)

# Role-based access decorator
def role_required(roles):
    """Decorator to restrict access based on roles."""
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            current_user = get_jwt_identity()
            if "role" not in current_user or current_user["role"] not in roles:
                return create_response(error="Access forbidden: insufficient role.", status=403)
            return fn(*args, **kwargs)
        return decorated_function
    return wrapper

@user_bp.route("/register", methods=["POST"])
def register():
    """Register a new user."""
    data = request.json

    # Validate required fields
    if not data or "username" not in data or "email" not in data or "password" not in data:
        return create_response(error="Missing required fields: username, email, password", status=400)

    try:
        # Check if the user already exists
        if User.query.filter_by(email=data["email"]).first():
            return create_response(error="User with this email already exists.", status=400)

        # Create new user
        hashed_password = generate_password_hash(data["password"])
        new_user = User(username=data["username"], email=data["email"], password=hashed_password, role="user")
        db.session.add(new_user)
        db.session.commit()

        return create_response(message="User registered successfully.", status=201)
    except Exception as e:
        return create_response(error=str(e), status=500)

@user_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and return a token."""
    data = request.json

    # Validate required fields
    if not data or "email" not in data or "password" not in data:
        return create_response(error="Missing required fields: email, password", status=400)

    try:
        # Find user by email
        user = User.query.filter_by(email=data["email"]).first()
        if not user or not check_password_hash(user.password, data["password"]):
            return create_response(error="Invalid email or password.", status=401)

        # Generate JWT token
        access_token = create_access_token(identity={"id": user.id, "username": user.username, "role": user.role})
        return create_response(data={"access_token": access_token}, message="Login successful.")
    except Exception as e:
        return create_response(error=str(e), status=500)

@user_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Retrieve details of the logged-in user."""
    current_user = get_jwt_identity()
    return create_response(data=current_user, message="User details retrieved successfully.")

@user_bp.route("/admin/protected", methods=["GET"])
@role_required(["admin"])
def admin_protected():
    """Admin-only route."""
    return create_response(message="Admin access granted.")

@user_bp.route("/manager/protected", methods=["GET"])
@role_required(["manager", "admin"])
def manager_protected():
    """Manager and Admin route."""
    return create_response(message="Manager or Admin access granted.")

@user_bp.route("/realtor/protected", methods=["GET"])
@role_required(["realtor", "admin"])
def realtor_protected():
    """Realtor and Admin route."""
    return create_response(message="Realtor or Admin access granted.")

@user_bp.route("/user/protected", methods=["GET"])
@role_required(["user", "admin"])
def user_protected():
    """User and Admin route."""
    return create_response(message="User or Admin access granted.")
