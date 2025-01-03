import os

class Config:
    """Base configuration class."""
    SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///data.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default_jwt_secret")
    UPLOAD_FOLDER = "uploads"
    SWAGGER_URL = "/api/docs"
    API_DOCS_URL = "/static/swagger.json"
