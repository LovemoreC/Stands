from marshmallow import Schema, fields

class UserSchema(Schema):
    id = fields.Int()
    username = fields.Str(required=True)
    email = fields.Email(required=True)
    role = fields.Str()
