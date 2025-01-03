from flask import jsonify
from marshmallow import ValidationError

def create_response(data=None, message=None, error=None, status=200):
    """Creates a standardized JSON response."""
    response = {
        "success": error is None,
        "message": message,
        "data": data,
        "error": error
    }
    return jsonify(response), status

def validate_request(data, required_fields):
    """Validates if the required fields are present in the request data."""
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    return True, None

def validate_schema(schema, data):
    """Validates request data against a Marshmallow schema."""
    try:
        validated_data = schema.load(data)
        return validated_data, None
    except ValidationError as err:
        return None, err.messages
