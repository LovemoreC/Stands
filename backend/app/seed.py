from sqlalchemy.orm import Session

from .core.security import get_password_hash
from .database import SessionLocal, engine, Base
from .models import entities


def seed_admin():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    existing = db.query(entities.User).filter(entities.User.email == "admin@stands.local").first()
    if existing:
        print("Admin already exists")
        return
    admin = entities.User(
        name="Default Admin",
        email="admin@stands.local",
        role="System Admin",
        password_hash=get_password_hash("admin123"),
        active=True,
    )
    db.add(admin)
    db.commit()
    print("Created default admin user admin@stands.local / admin123")


if __name__ == "__main__":
    seed_admin()
