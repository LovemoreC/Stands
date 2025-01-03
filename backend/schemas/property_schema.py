from marshmallow import Schema, fields

class PropertySchema(Schema):
    id = fields.Int()
    number = fields.Str(required=True)
    price = fields.Float(required=True)
    status = fields.Str()
