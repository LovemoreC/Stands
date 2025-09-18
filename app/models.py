from enum import Enum
from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel, Field


class UploadedFile(BaseModel):
    filename: str
    content_type: str
    content: str


class PropertyStatus(str, Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    SOLD = "sold"
    ARCHIVED = "archived"


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None


class Project(ProjectBase):
    id: int


class ProjectCreate(ProjectBase):
    pass


class MandateStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Mandate(BaseModel):
    agent: str
    document: Optional[str] = None
    status: MandateStatus = MandateStatus.PENDING
    agreement_status: Optional[str] = None
    expiration_date: Optional[datetime] = None


class MandateRecord(Mandate):
    """Persistent mandate linking an agent to a project."""

    id: int
    project_id: int


class MandateHistoryEntry(BaseModel):
    """Represents a status change in a mandate's lifecycle."""

    timestamp: datetime
    status: MandateStatus


class StandBase(BaseModel):
    project_id: int
    name: str
    size: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    status: PropertyStatus = PropertyStatus.AVAILABLE


class Stand(StandBase):
    id: int
    mandate: Optional[Mandate] = None


class StandCreate(StandBase):
    pass


class AgentRole(str, Enum):
    ADMIN = "admin"
    AGENT = "agent"
    MANAGER = "manager"
    COMPLIANCE = "compliance"


class Agent(BaseModel):
    username: str
    role: AgentRole


class AgentCreate(Agent):
    password: str = Field(..., min_length=8)


class AgentInDB(Agent):
    password_hash: str


class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class LoanDecision(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"


class LoanStatus(str, Enum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class Loan(BaseModel):
    id: int
    borrower: str
    amount: float
    status: LoanStatus = LoanStatus.SUBMITTED
    reason: Optional[str] = None


class LoanDecisionRequest(BaseModel):
    decision: LoanStatus
    reason: Optional[str] = None


class Offer(BaseModel):
    id: int
    realtor: str
    property_id: int
    details: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    document: Optional[UploadedFile] = None


class PropertyApplication(BaseModel):
    id: int
    realtor: str
    property_id: int
    details: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    document: Optional[UploadedFile] = None


class AccountOpening(BaseModel):
    id: int
    realtor: str
    details: Optional[str] = None
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    account_number: Optional[str] = None
    deposit_threshold: Optional[float] = None
    deposits: List[float] = Field(default_factory=list)
    document: Optional[UploadedFile] = None


class LoanApplication(BaseModel):
    id: int
    realtor: str
    account_id: int
    property_id: Optional[int] = None
    documents: List[str] = Field(default_factory=list)
    status: SubmissionStatus = SubmissionStatus.SUBMITTED
    decision: Optional[LoanDecision] = None
    reason: Optional[str] = None
    loan_account_number: Optional[str] = None


class StatusUpdate(BaseModel):
    status: SubmissionStatus


class AccountSetup(BaseModel):
    account_number: str
    deposit_threshold: float = Field(..., gt=0)


class Deposit(BaseModel):
    amount: float = Field(..., gt=0)


class LoanDecisionUpdate(BaseModel):
    decision: LoanDecision
    reason: Optional[str] = None


class AgreementCreate(BaseModel):
    id: int
    loan_application_id: int
    property_id: int


class AgreementUpload(BaseModel):
    document: str


class AgreementSign(BaseModel):
    document_url: str


class AgreementStatus(str, Enum):
    DRAFT = "draft"
    PARTIALLY_SIGNED = "partially_signed"
    SIGNED = "signed"


class Agreement(BaseModel):
    id: int
    loan_application_id: int
    property_id: int
    realtor: str
    document: str
    versions: List[str] = Field(default_factory=list)
    bank_document_url: Optional[str] = None
    customer_document_url: Optional[str] = None
    status: AgreementStatus = AgreementStatus.DRAFT
    audit_log: List[str] = Field(default_factory=list)


class AgreementExecution(BaseModel):
    loan_account_number: str
