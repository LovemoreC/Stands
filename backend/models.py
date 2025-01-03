from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.orm import validates

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user')

    projects = db.relationship('Project', backref='manager', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @validates('email')
    def validate_email(self, key, email):
        assert '@' in email, "Invalid email format"
        return email

    def __repr__(self):
        return f"<User {self.username}, Role: {self.role}>"

class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    assigned_realtors = db.relationship('User', secondary='project_realtor', backref='assigned_projects', lazy='dynamic')

    def __repr__(self):
        return f"<Project {self.name}>"

class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)

    payments = db.relationship('Payment', backref='customer', lazy=True)

    @validates('email')
    def validate_email(self, key, email):
        assert '@' in email, "Invalid email format"
        return email

    def __repr__(self):
        return f"<Customer {self.name}, Email: {self.email}>"

class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False, default=db.func.current_timestamp())
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)

    def __repr__(self):
        return f"<Payment {self.amount} for Customer ID: {self.customer_id}>"

# Association Table
project_realtor = db.Table('project_realtor',
    db.Column('project_id', db.Integer, db.ForeignKey('projects.id'), primary_key=True),
    db.Column('realtor_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)
