import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, DateTime, Enum, Numeric, Text, JSON
from sqlalchemy.orm import relationship
from ..database import Base


class StandStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    BLOCKED = "BLOCKED"


class ReservationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class SaleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    active = Column(Boolean, default=True)

    reservations = relationship("Reservation", back_populates="realtor")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    description = Column(Text)

    stands = relationship("Stand", back_populates="project")


class Stand(Base):
    __tablename__ = "stands"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    stand_number = Column(String, nullable=False)
    size_m2 = Column(Numeric, nullable=False)
    price = Column(Numeric, nullable=False)
    status = Column(Enum(StandStatus), default=StandStatus.AVAILABLE, nullable=False)
    notes = Column(Text)

    project = relationship("Project", back_populates="stands")
    reservations = relationship("Reservation", back_populates="stand")
    sale = relationship("Sale", back_populates="stand", uselist=False)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    national_id = Column(String, unique=True, nullable=False)
    phone = Column(String)
    email = Column(String)
    address = Column(String)

    reservations = relationship("Reservation", back_populates="client")
    sales = relationship("Sale", back_populates="client")


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    stand_id = Column(Integer, ForeignKey("stands.id"), nullable=False)
    realtor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    reservation_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    status = Column(Enum(ReservationStatus), default=ReservationStatus.PENDING, nullable=False)

    stand = relationship("Stand", back_populates="reservations")
    realtor = relationship("User", back_populates="reservations")
    client = relationship("Client", back_populates="reservations")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    stand_id = Column(Integer, ForeignKey("stands.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    sale_date = Column(Date, nullable=False)
    sale_price = Column(Numeric, nullable=False)
    status = Column(Enum(SaleStatus), default=SaleStatus.ACTIVE, nullable=False)

    stand = relationship("Stand", back_populates="sale")
    client = relationship("Client", back_populates="sales")
    payment_plan = relationship("PaymentPlan", back_populates="sale", uselist=False)
    payments = relationship("Payment", back_populates="sale")


class PaymentPlan(Base):
    __tablename__ = "payment_plans"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    total_due = Column(Numeric, nullable=False)
    deposit_due = Column(Numeric, nullable=False)
    installment_amount = Column(Numeric, nullable=False)
    frequency = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String, nullable=False)

    sale = relationship("Sale", back_populates="payment_plan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    amount = Column(Numeric, nullable=False)
    date = Column(Date, nullable=False)
    method = Column(String, nullable=False)
    reference = Column(String)
    recorded_by = Column(Integer, ForeignKey("users.id"))

    sale = relationship("Sale", back_populates="payments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    entity = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    meta_json = Column(JSON)
