import pytest
from extensions import db
from models import User, Project, Property, Application, Payment

@pytest.fixture
def setup_database(app):
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()

# Test User Model
def test_user_model(setup_database):
    user = User(username="testuser", email="test@example.com", password="password123", role="realtor")
    db.session.add(user)
    db.session.commit()

    assert user.id is not None
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.role == "realtor"

# Test Project Model
def test_project_model(setup_database):
    project = Project(name="Test Project", description="A project for testing.")
    db.session.add(project)
    db.session.commit()

    assert project.id is not None
    assert project.name == "Test Project"
    assert project.description == "A project for testing."

# Test Property Model
def test_property_model(setup_database):
    project = Project(name="Test Project")
    db.session.add(project)
    db.session.commit()

    property = Property(number="P101", name="Plot 1", price=10000.0, status="available", project_id=project.id)
    db.session.add(property)
    db.session.commit()

    assert property.id is not None
    assert property.number == "P101"
    assert property.name == "Plot 1"
    assert property.price == 10000.0
    assert property.status == "available"
    assert property.project_id == project.id

# Test Application Model
def test_application_model(setup_database):
    user = User(username="realtor", email="realtor@example.com", password="password123", role="realtor")
    project = Project(name="Test Project")
    property = Property(number="P101", name="Plot 1", price=10000.0, status="reserved", project_id=1)
    db.session.add_all([user, project, property])
    db.session.commit()

    application = Application(
        property_id=property.id,
        realtor_id=user.id,
        customer_name="John Doe",
        customer_email="johndoe@example.com",
        customer_phone="123456789",
        status="pending"
    )
    db.session.add(application)
    db.session.commit()

    assert application.id is not None
    assert application.customer_name == "John Doe"
    assert application.status == "pending"

# Test Payment Model
def test_payment_model(setup_database):
    application = Application(
        property_id=1,
        realtor_id=1,
        customer_name="Jane Smith",
        customer_email="janesmith@example.com",
        customer_phone="987654321",
        status="approved"
    )
    db.session.add(application)
    db.session.commit()

    payment = Payment(application_id=application.id, amount=1500.0, status="approved")
    db.session.add(payment)
    db.session.commit()

    assert payment.id is not None
    assert payment.amount == 1500.0
    assert payment.status == "approved"
    assert payment.application_id == application.id
