from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


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


class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class LoanDecision(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"


class Offer(BaseModel):
    id: int
    realtor: str
    property_id: int
    details: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.SUBMITTED


class PropertyApplication(BaseModel):
    id: int
    realtor: str
    property_id: int
    details: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.SUBMITTED


class AccountOpening(BaseModel):
    id: int
    realtor: str
    details: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    account_number: Optional[str] = None
    deposit_threshold: Optional[float] = None
    deposits: List[float] = Field(default_factory=list)


class LoanApplication(BaseModel):
    id: int
    realtor: str
    account_id: int
    documents: List[str] = Field(default_factory=list)
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    decision: Optional[LoanDecision] = None
    reason: Optional[str] = None


class StatusUpdate(BaseModel):
    status: SubmissionStatus


class AccountSetup(BaseModel):
    account_number: str
    deposit_threshold: float


class Deposit(BaseModel):
    amount: float


class LoanDecisionUpdate(BaseModel):
    decision: LoanDecision
    reason: Optional[str] = None
