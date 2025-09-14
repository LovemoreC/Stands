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


class Stand(BaseModel):
    id: int
    project_id: int
    name: str
    status: PropertyStatus = PropertyStatus.AVAILABLE
    mandate_agent: Optional[str] = None


class Mandate(BaseModel):
    agent: str
