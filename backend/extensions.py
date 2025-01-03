from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_migrate import Migrate

# Initialize Flask extensions

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()
migrate = Migrate()

__all__ = ["db", "jwt", "socketio", "migrate"]
