from fastapi import FastAPI, HTTPException, Depends, Header, Request, UploadFile, File, Response
from typing import List, Optional
from datetime import datetime
import secrets
import hashlib
import hmac
import csv
from io import BytesIO
from pydantic import BaseModel
from openpyxl import load_workbook
from .database import init_db, get_session, SessionLocal
from .repositories import Repositories
from .reporting import generate_properties_report
from .models import (
    Project,
    Stand,
    PropertyStatus,
    Mandate,
    Agent,
    AgentCreate,
    AgentInDB,
    AgentRole,
    MandateStatus,
    SubmissionStatus,
    Offer,
    PropertyApplication,
    AccountOpening,
    StatusUpdate,
    AccountSetup,
    Deposit,
    LoanApplication,
    LoanDecisionUpdate,
    LoanDecision,
    Agreement,
    AgreementCreate,
    AgreementUpload,
    AgreementExecution,
)

app = FastAPI(title="Property Management API")
init_db()


def get_repositories(session=Depends(get_session)) -> Repositories:
    return Repositories(session)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hmac.compare_digest(hash_password(password), hashed)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_current_agent(
    x_token: str = Header(...), repos: Repositories = Depends(get_repositories)
) -> Agent:
    username = repos.tokens.get(hash_token(x_token))
    if not username:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    agent_in_db = repos.agents.get(username)
    if not agent_in_db:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return Agent(username=agent_in_db.username, role=agent_in_db.role)


def require_admin(agent: Agent = Depends(get_current_agent)) -> Agent:
    if agent.role != AgentRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return agent


def require_compliance(agent: Agent = Depends(get_current_agent)) -> Agent:
    if agent.role not in (AgentRole.COMPLIANCE, AgentRole.ADMIN):
        raise HTTPException(status_code=403, detail="Compliance privileges required")
    return agent


@app.middleware("http")
async def log_request(request: Request, call_next):
    token = request.headers.get("x-token")
    session = SessionLocal()
    repos = Repositories(session)
    username = "anonymous"
    if token:
        uname = repos.tokens.get(hash_token(token))
        if uname:
            username = uname
    timestamp = datetime.utcnow().isoformat()
    response = await call_next(request)
    repos.audit_log.append(
        f"{timestamp} - {username} - {request.method} {request.url.path} - {response.status_code}"
    )
    session.close()
    return response


@app.post("/agents", response_model=Agent)
def create_agent(agent: AgentCreate, repos: Repositories = Depends(get_repositories)):
    if repos.agents.get(agent.username):
        raise HTTPException(status_code=400, detail="Agent exists")
    if agent.role not in AgentRole:
        raise HTTPException(status_code=400, detail="Unknown role")
    password_hash = hash_password(agent.password)
    agent_db = AgentInDB(username=agent.username, role=agent.role, password_hash=password_hash)
    repos.agents.add(agent_db)
    return Agent(username=agent.username, role=agent.role)


class LoginRequest(BaseModel):
    username: str
    password: str


class ImportResult(BaseModel):
    imported: int
    errors: List[str]


@app.post("/login")
def login(data: LoginRequest, repos: Repositories = Depends(get_repositories)):
    agent = repos.agents.get(data.username)
    if not agent or not verify_password(data.password, agent.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = secrets.token_hex(16)
    repos.tokens.set(hash_token(token), agent.username)
    return {"token": token}


@app.post("/projects", response_model=Project)
def create_project(
    project: Project,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    if repos.projects.get(project.id):
        raise HTTPException(status_code=400, detail="Project ID exists")
    repos.projects.add(project)
    return project


@app.get("/projects", response_model=List[Project])
def list_projects(
    _: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    return repos.projects.list()


@app.post("/stands", response_model=Stand)
def create_stand(
    stand: Stand,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    if repos.stands.get(stand.id):
        raise HTTPException(status_code=400, detail="Stand ID exists")
    if not repos.projects.get(stand.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    repos.stands.add(stand)
    return stand


@app.put("/stands/{stand_id}", response_model=Stand)
def update_stand(
    stand_id: int,
    stand: Stand,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    existing = repos.stands.get(stand_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Stand not found")
    if existing.status == PropertyStatus.SOLD:
        raise HTTPException(status_code=400, detail="Stand already sold")
    if not repos.projects.get(stand.project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    repos.stands.add(stand)
    return stand


@app.delete("/stands/{stand_id}", response_model=Stand)
def archive_stand(
    stand_id: int,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    stand = repos.stands.get(stand_id)
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.status == PropertyStatus.SOLD:
        raise HTTPException(status_code=400, detail="Stand already sold")
    stand.status = PropertyStatus.ARCHIVED
    repos.stands.add(stand)
    return stand


@app.post("/stands/{stand_id}/mandate", response_model=Stand)
def assign_mandate(
    stand_id: int,
    mandate: Mandate,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    stand = repos.stands.get(stand_id)
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.status == PropertyStatus.SOLD:
        raise HTTPException(status_code=400, detail="Stand already sold")
    stand.mandate = mandate
    stand.mandate.status = MandateStatus.PENDING
    repos.stands.add(stand)
    return stand


@app.put("/stands/{stand_id}/mandate/accept", response_model=Stand)
def accept_mandate(
    stand_id: int,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    stand = repos.stands.get(stand_id)
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.status == PropertyStatus.SOLD:
        raise HTTPException(status_code=400, detail="Stand already sold")
    if not stand.mandate or stand.mandate.agent != agent.username:
        raise HTTPException(status_code=403, detail="Not authorized to accept this mandate")
    stand.mandate.status = MandateStatus.ACCEPTED
    repos.stands.add(stand)
    return stand


@app.get("/stands/available", response_model=List[Stand])
def available_stands(
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    result = [s for s in repos.stands.list() if s.status == PropertyStatus.AVAILABLE]
    if agent.role == AgentRole.AGENT:
        result = [
            s
            for s in result
            if s.mandate and s.mandate.agent == agent.username and s.mandate.status == MandateStatus.ACCEPTED
        ]
    return result


@app.get("/stands/{stand_id}", response_model=Stand)
def get_stand(
    stand_id: int,
    _: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    stand = repos.stands.get(stand_id)
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    return stand


@app.post("/import/properties", response_model=ImportResult)
def import_properties(
    file: UploadFile = File(...),
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    filename = file.filename or ""
    content = file.file.read()
    rows = []
    if filename.endswith(".csv"):
        try:
            text = content.decode("utf-8")
            reader = csv.DictReader(text.splitlines())
            rows = list(reader)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid CSV file")
    elif filename.endswith(".xls") or filename.endswith(".xlsx"):
        try:
            wb = load_workbook(BytesIO(content), read_only=True)
            ws = wb.active
            headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
            for row in ws.iter_rows(min_row=2, values_only=True):
                rows.append(dict(zip(headers, row)))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Excel file")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    imported = 0
    errors: List[str] = []
    for idx, row in enumerate(rows, start=2):
        try:
            project_id = int(row.get("project_id"))
            project_name = row.get("project_name")
            stand_id = int(row.get("stand_id"))
            stand_name = row.get("stand_name") or ""
            size = float(row.get("size"))
            price = float(row.get("price"))
            if not project_name:
                raise ValueError("project_name is required")
        except (TypeError, ValueError) as e:
            errors.append(f"Row {idx}: {e}")
            continue

        project = repos.projects.get(project_id)
        if not project:
            repos.projects.add(Project(id=project_id, name=project_name))
        elif project.name != project_name:
            errors.append(
                f"Row {idx}: project name mismatch for ID {project_id}"
            )
            continue

        if repos.stands.get(stand_id):
            errors.append(f"Row {idx}: stand ID {stand_id} exists")
            continue

        stand = Stand(
            id=stand_id,
            project_id=project_id,
            name=stand_name,
            size=size,
            price=price,
        )
        repos.stands.add(stand)
        imported += 1

    return ImportResult(imported=imported, errors=errors)


# Reporting endpoints


@app.get("/reports/properties")
def properties_report(
    status: Optional[PropertyStatus] = None,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    csv_data = generate_properties_report(repos, status)
    return Response(content=csv_data, media_type="text/csv")


# ---- Submission endpoints ----


def _ensure_owner(obj_realtor: str, agent: Agent):
    if agent.role != AgentRole.ADMIN and obj_realtor != agent.username:
        raise HTTPException(status_code=403, detail="Not authorized")


@app.post("/offers", response_model=Offer)
def submit_offer(
    offer: Offer,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    if repos.offers.get(offer.id):
        raise HTTPException(status_code=400, detail="Offer ID exists")
    if agent.username != offer.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    repos.offers.add(offer)
    repos.notifications.append(f"Offer {offer.id} submitted by {offer.realtor}")
    return offer


@app.get("/offers/{offer_id}", response_model=Offer)
def get_offer(
    offer_id: int,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    offer = repos.offers.get(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    _ensure_owner(offer.realtor, agent)
    return offer


@app.put("/offers/{offer_id}/status", response_model=Offer)
def update_offer_status(
    offer_id: int,
    update: StatusUpdate,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    offer = repos.offers.get(offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer.status = update.status
    repos.offers.add(offer)
    return offer


@app.post("/property-applications", response_model=PropertyApplication)
def submit_property_application(
    application: PropertyApplication,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    if repos.applications.get(application.id):
        raise HTTPException(status_code=400, detail="Application ID exists")
    if agent.username != application.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    repos.applications.add(application)
    repos.notifications.append(
        f"Property application {application.id} submitted by {application.realtor}"
    )
    return application


@app.get("/property-applications/{app_id}", response_model=PropertyApplication)
def get_property_application(
    app_id: int,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    application = repos.applications.get(app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    _ensure_owner(application.realtor, agent)
    return application


@app.put("/property-applications/{app_id}/status", response_model=PropertyApplication)
def update_property_application_status(
    app_id: int,
    update: StatusUpdate,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    application = repos.applications.get(app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    application.status = update.status
    repos.applications.add(application)
    return application


@app.post("/account-openings", response_model=AccountOpening)
def submit_account_opening(
    request: AccountOpening,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    if repos.account_openings.get(request.id):
        raise HTTPException(status_code=400, detail="Request ID exists")
    if agent.username != request.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    repos.account_openings.add(request)
    repos.notifications.append(
        f"Account opening {request.id} submitted by {request.realtor}"
    )
    return request


@app.get("/account-openings/{req_id}", response_model=AccountOpening)
def get_account_opening(
    req_id: int,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    request = repos.account_openings.get(req_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    _ensure_owner(request.realtor, agent)
    return request


@app.put("/account-openings/{req_id}/status", response_model=AccountOpening)
def update_account_opening_status(
    req_id: int,
    update: StatusUpdate,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    request = repos.account_openings.get(req_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    request.status = update.status
    repos.account_openings.add(request)
    return request


@app.put("/account-openings/{req_id}/open", response_model=AccountOpening)
def open_account(
    req_id: int,
    details: AccountSetup,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    request = repos.account_openings.get(req_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if details.deposit_threshold <= 0:
        raise HTTPException(status_code=400, detail="Deposit threshold must be positive")
    request.account_number = details.account_number
    request.deposit_threshold = details.deposit_threshold
    request.status = SubmissionStatus.IN_PROGRESS
    repos.account_openings.add(request)
    return request


@app.post("/account-openings/{req_id}/deposit", response_model=AccountOpening)
def record_deposit(
    req_id: int,
    deposit: Deposit,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    request = repos.account_openings.get(req_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    if deposit.amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be positive")
    request.deposits.append(deposit.amount)
    if request.deposit_threshold is not None and sum(request.deposits) >= request.deposit_threshold:
        request.status = SubmissionStatus.COMPLETED
    repos.account_openings.add(request)
    return request


@app.post("/loan-applications", response_model=LoanApplication)
def submit_loan_application(
    application: LoanApplication,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    if repos.loan_applications.get(application.id):
        raise HTTPException(status_code=400, detail="Loan application ID exists")
    if agent.username != application.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    account = repos.account_openings.get(application.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.status != SubmissionStatus.COMPLETED:
        raise HTTPException(
            status_code=400, detail="Deposits not sufficient for loan application"
        )
    if not application.documents:
        raise HTTPException(status_code=400, detail="Documentation required")
    repos.loan_applications.add(application)
    repos.notifications.append(
        f"Loan application {application.id} submitted by {application.realtor}"
    )
    return application


@app.get("/loan-applications/{app_id}", response_model=LoanApplication)
def get_loan_application(
    app_id: int,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    application = repos.loan_applications.get(app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Loan application not found")
    _ensure_owner(application.realtor, agent)
    return application


@app.put("/loan-applications/{app_id}/decision", response_model=LoanApplication)
def decide_loan_application(
    app_id: int,
    decision: LoanDecisionUpdate,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    application = repos.loan_applications.get(app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Loan application not found")
    application.decision = decision.decision
    application.reason = decision.reason
    if decision.decision == LoanDecision.APPROVED:
        application.status = SubmissionStatus.COMPLETED
    else:
        application.status = SubmissionStatus.REJECTED
    repos.loan_applications.add(application)
    return application


@app.get("/notifications", response_model=List[str])
def list_notifications(
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    return repos.notifications.list()


@app.get("/loan-accounts/{realtor}", response_model=List[str])
def list_loan_accounts(
    realtor: str,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    if agent.role != AgentRole.ADMIN and agent.username != realtor:
        raise HTTPException(status_code=403, detail="Not authorized")
    return repos.customer_loan_accounts.get(realtor, [])


@app.get("/dashboard")
def dashboard(
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    data = {}
    if agent.role in (AgentRole.MANAGER, AgentRole.ADMIN):
        stands_list = repos.stands.list()
        prop_counts = {
            status.value: sum(1 for s in stands_list if s.status == status)
            for status in PropertyStatus
        }
        mandate_counts = {
            status.value: sum(
                1
                for s in stands_list
                if s.mandate and s.mandate.status == status
            )
            for status in MandateStatus
        }
        data["property_status"] = prop_counts
        data["mandates"] = mandate_counts
    if agent.role in (AgentRole.COMPLIANCE, AgentRole.ADMIN):
        openings = repos.account_openings.list()
        total_deposits = sum(sum(req.deposits) for req in openings)
        apps = repos.loan_applications.list()
        approvals = sum(
            1 for app in apps if app.decision == LoanDecision.APPROVED
        )
        rejections = sum(
            1 for app in apps if app.decision == LoanDecision.REJECTED
        )
        data["deposits"] = total_deposits
        data["loan_approvals"] = {"approved": approvals, "rejected": rejections}
    return data


@app.get("/audit-log", response_model=List[str])
def get_audit_log(
    _: Agent = Depends(require_compliance),
    repos: Repositories = Depends(get_repositories),
):
    return repos.audit_log.list()


# ---- Agreement endpoints ----


@app.post("/agreements/generate", response_model=Agreement)
def generate_agreement(
    data: AgreementCreate,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    if repos.agreements.get(data.id):
        raise HTTPException(status_code=400, detail="Agreement ID exists")
    loan = repos.loan_applications.get(data.loan_application_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan application not found")
    stand = repos.stands.get(data.property_id)
    if not stand:
        raise HTTPException(status_code=404, detail="Property not found")
    content = f"Agreement for property {stand.name} with loan {loan.id}"
    timestamp = datetime.utcnow().isoformat()
    agreement = Agreement(
        id=data.id,
        loan_application_id=data.loan_application_id,
        property_id=data.property_id,
        realtor=loan.realtor,
        document=content,
        versions=[content],
        audit_log=[f"{timestamp}: generated"],
    )
    repos.agreements.add(agreement)
    return agreement


@app.get("/agreements/{agreement_id}", response_model=Agreement)
def get_agreement(
    agreement_id: int,
    _: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    agreement = repos.agreements.get(agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return agreement


@app.put("/agreements/{agreement_id}/sign", response_model=Agreement)
def sign_agreement(
    agreement_id: int,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    agreement = repos.agreements.get(agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    timestamp = datetime.utcnow().isoformat()
    if agent.role == AgentRole.ADMIN:
        agreement.bank_signature = f"signed by {agent.username} at {timestamp}"
        agreement.audit_log.append(
            f"{timestamp}: bank signed by {agent.username}"
        )
    else:
        if agent.username != agreement.realtor:
            raise HTTPException(status_code=403, detail="Agent not authorized to sign")
        agreement.customer_signature = f"signed by {agent.username} at {timestamp}"
        agreement.audit_log.append(
            f"{timestamp}: customer signed by {agent.username}"
        )
    repos.agreements.add(agreement)
    return agreement


@app.post("/agreements/{agreement_id}/upload", response_model=Agreement)
def upload_agreement(
    agreement_id: int,
    upload: AgreementUpload,
    agent: Agent = Depends(get_current_agent),
    repos: Repositories = Depends(get_repositories),
):
    agreement = repos.agreements.get(agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    agreement.versions.append(upload.document)
    agreement.document = upload.document
    timestamp = datetime.utcnow().isoformat()
    role = "bank" if agent.role == AgentRole.ADMIN else "customer"
    agreement.audit_log.append(f"{timestamp}: {role} uploaded new version")
    repos.agreements.add(agreement)
    return agreement


@app.put("/agreements/{agreement_id}/execute", response_model=Agreement)
def execute_agreement(
    agreement_id: int,
    execution: AgreementExecution,
    _: Agent = Depends(require_admin),
    repos: Repositories = Depends(get_repositories),
):
    agreement = repos.agreements.get(agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if not agreement.bank_signature or not agreement.customer_signature:
        raise HTTPException(status_code=400, detail="Agreement not fully signed")
    loan_application = repos.loan_applications.get(agreement.loan_application_id)
    loan_application.loan_account_number = execution.loan_account_number
    repos.loan_applications.add(loan_application)
    realtor = loan_application.realtor
    accounts = repos.customer_loan_accounts.get(realtor, [])
    accounts.append(execution.loan_account_number)
    repos.customer_loan_accounts.set(realtor, accounts)
    stand = repos.stands.get(agreement.property_id)
    stand.status = PropertyStatus.SOLD
    repos.stands.add(stand)
    repos.notifications.append(
        f"Agreement {agreement_id} executed; notify Loan Accounts Opening Team"
    )
    repos.agreements.add(agreement)
    return agreement
