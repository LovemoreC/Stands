from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    active: bool = True


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProjectBase(BaseModel):
    name: str
    location: str
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: int

    class Config:
        orm_mode = True


class StandBase(BaseModel):
    project_id: int
    stand_number: str
    size_m2: Decimal
    price: Decimal
    status: str
    notes: Optional[str] = None


class StandCreate(StandBase):
    pass


class StandOut(StandBase):
    id: int

    class Config:
        orm_mode = True


class ClientBase(BaseModel):
    full_name: str
    national_id: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientOut(ClientBase):
    id: int

    class Config:
        orm_mode = True


class ReservationBase(BaseModel):
    stand_id: int
    realtor_id: int
    client_id: int
    reservation_date: date
    expiry_date: date
    status: str


class ReservationCreate(ReservationBase):
    pass


class ReservationOut(ReservationBase):
    id: int

    class Config:
        orm_mode = True


class SaleBase(BaseModel):
    stand_id: int
    client_id: int
    sale_date: date
    sale_price: Decimal
    status: str


class SaleCreate(SaleBase):
    pass


class SaleOut(SaleBase):
    id: int

    class Config:
        orm_mode = True


class PaymentPlanBase(BaseModel):
    sale_id: int
    total_due: Decimal
    deposit_due: Decimal
    installment_amount: Decimal
    frequency: str
    start_date: date
    end_date: date
    status: str


class PaymentPlanCreate(PaymentPlanBase):
    pass


class PaymentPlanOut(PaymentPlanBase):
    id: int

    class Config:
        orm_mode = True


class PaymentBase(BaseModel):
    sale_id: int
    amount: Decimal
    date: date
    method: str
    reference: Optional[str] = None
    recorded_by: Optional[int] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentOut(PaymentBase):
    id: int

    class Config:
        orm_mode = True


class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int
    action: str
    entity: str
    entity_id: int
    timestamp: datetime

    class Config:
        orm_mode = True
