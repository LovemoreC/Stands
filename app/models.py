from enum import Enum
from pydantic import BaseModel
from typing import Optional


class PropertyStatus(str, Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    SOLD = "sold"
    ARCHIVED = "archived"


class Project(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class MandateStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Mandate(BaseModel):
    agent: str
    document: Optional[str] = None
    status: MandateStatus = MandateStatus.PENDING


class Stand(BaseModel):
    id: int
    project_id: int
    name: str
    status: PropertyStatus = PropertyStatus.AVAILABLE
    mandate: Optional[Mandate] = None


class Agent(BaseModel):
    username: str
    role: str
