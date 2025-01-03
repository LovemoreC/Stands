from flask import Flask
from extensions import db
from models import User, Project, Property

def register_commands(app: Flask):
    """Register custom CLI commands."""

    @app.cli.command("seed_db")
    def seed_db():
        """Seed the database with initial data."""
        # Example seed data
        admin_user = User(username="admin", email="admin@example.com", password="admin123", role="admin")
        project = Project(name="Sample Project", description="A sample project for testing.")
        property1 = Property(number="P101", name="Plot 1", price=10000.0, status="available", project_id=1)

        db.session.add(admin_user)
        db.session.add(project)
        db.session.add(property1)
        db.session.commit()

        print("Database seeded successfully.")

    @app.cli.command("drop_db")
    def drop_db():
        """Drop all database tables."""
        db.drop_all()
        print("Database dropped successfully.")

    @app.cli.command("create_db")
    def create_db():
        """Create all database tables."""
        db.create_all()
        print("Database created successfully.")
