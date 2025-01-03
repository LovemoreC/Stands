import pytest
from schemas.user_schema import UserSchema
from schemas.property_schema import PropertySchema
from marshmallow.exceptions import ValidationError

# Test User Schema

def test_user_schema_valid():
    schema = UserSchema()
    valid_data = {
        "username": "testuser",
        "email": "test@example.com",
        "role": "realtor",
        "permissions": ["view_projects", "create_reservations"]
    }

    result = schema.load(valid_data)
    assert result["username"] == "testuser"
    assert result["email"] == "test@example.com"
    assert result["role"] == "realtor"
    assert "permissions" in result


def test_user_schema_missing_fields():
    schema = UserSchema()
    missing_data = {
        "email": "test@example.com"
    }

    with pytest.raises(ValidationError) as exc_info:
        schema.load(missing_data)

    assert "username" in exc_info.value.messages


def test_user_schema_invalid_fields():
    schema = UserSchema()
    invalid_data = {
        "username": "",
        "email": "invalid-email",
        "role": 123,
        "permissions": "not-a-list"
    }

    with pytest.raises(ValidationError) as exc_info:
        schema.load(invalid_data)

    assert "email" in exc_info.value.messages
    assert "role" in exc_info.value.messages
    assert "permissions" in exc_info.value.messages

# Additional validations for User Schema
def test_user_schema_email_length():
    schema = UserSchema()
    invalid_data = {
        "username": "user",
        "email": "a" * 256 + "@example.com",
        "role": "admin",
        "permissions": []
    }

    with pytest.raises(ValidationError) as exc_info:
        schema.load(invalid_data)

    assert "email" in exc_info.value.messages

# Test Property Schema

def test_property_schema_valid():
    schema = PropertySchema()
    valid_data = {
        "number": "P101",
        "name": "Plot 1",
        "price": 15000.0,
        "status": "available",
        "latitude": 12.34,
        "longitude": 56.78,
        "project_id": 1
    }

    result = schema.load(valid_data)
    assert result["number"] == "P101"
    assert result["name"] == "Plot 1"
    assert result["price"] == 15000.0
    assert result["project_id"] == 1


def test_property_schema_missing_fields():
    schema = PropertySchema()
    missing_data = {
        "name": "Plot 1",
        "price": 15000.0
    }

    with pytest.raises(ValidationError) as exc_info:
        schema.load(missing_data)

    assert "number" in exc_info.value.messages
    assert "project_id" in exc_info.value.messages


def test_property_schema_invalid_fields():
    schema = PropertySchema()
    invalid_data = {
        "number": 123,
        "name": 456,
        "price": "invalid-float",
        "status": "unknown",
        "latitude": "not-a-float",
        "longitude": "not-a-float",
        "project_id": "not-an-int"
    }

    with pytest.raises(ValidationError) as exc_info:
        schema.load(invalid_data)

    assert "number" in exc_info.value.messages
    assert "name" in exc_info.value.messages
    assert "price" in exc_info.value.messages
    assert "latitude" in exc_info.value.messages
    assert "longitude" in exc_info.value.messages
    assert "project_id" in exc_info.value.messages

# Additional validations for Property Schema
def test_property_schema_price_boundary():
    schema = PropertySchema()
    invalid_data = {
        "number": "P102",
        "name": "Plot 2",
        "price": -1.0,
        "status": "available",
        "project_id": 1
    }

    with pytest.raises(ValidationError) as exc_info:
        schema.load(invalid_data)

    assert "price" in exc_info.value.messages
