from fastapi import FastAPI, HTTPException, Depends, Header
from typing import Dict, List
from .models import (
    Project,
    Stand,
    PropertyStatus,
    Mandate,
    Agent,
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
)

app = FastAPI(title="Property Management API")

# In-memory stores
projects: Dict[int, Project] = {}
stands: Dict[int, Stand] = {}
agents: Dict[str, Agent] = {}
offers: Dict[int, Offer] = {}
applications: Dict[int, PropertyApplication] = {}
account_openings: Dict[int, AccountOpening] = {}
loan_applications: Dict[int, LoanApplication] = {}
notifications: List[str] = []


def get_current_agent(x_token: str = Header(...)) -> Agent:
    if x_token not in agents:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return agents[x_token]


def require_admin(agent: Agent = Depends(get_current_agent)) -> Agent:
    if agent.role != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return agent


@app.post("/agents", response_model=Agent)
def create_agent(agent: Agent):
    if agent.username in agents:
        raise HTTPException(status_code=400, detail="Agent exists")
    agents[agent.username] = agent
    return agent


@app.post("/projects", response_model=Project)
def create_project(project: Project, _: Agent = Depends(require_admin)):
    if project.id in projects:
        raise HTTPException(status_code=400, detail="Project ID exists")
    projects[project.id] = project
    return project


@app.get("/projects", response_model=List[Project])
def list_projects(_: Agent = Depends(get_current_agent)):
    return list(projects.values())


@app.post("/stands", response_model=Stand)
def create_stand(stand: Stand, _: Agent = Depends(require_admin)):
    if stand.id in stands:
        raise HTTPException(status_code=400, detail="Stand ID exists")
    if stand.project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    stands[stand.id] = stand
    return stand


@app.put("/stands/{stand_id}", response_model=Stand)
def update_stand(stand_id: int, stand: Stand, _: Agent = Depends(require_admin)):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    stands[stand_id] = stand
    return stand


@app.delete("/stands/{stand_id}", response_model=Stand)
def archive_stand(stand_id: int, _: Agent = Depends(require_admin)):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    stand = stands[stand_id]
    stand.status = PropertyStatus.ARCHIVED
    stands[stand_id] = stand
    return stand


@app.post("/stands/{stand_id}/mandate", response_model=Stand)
def assign_mandate(stand_id: int, mandate: Mandate, _: Agent = Depends(require_admin)):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    stand = stands[stand_id]
    stand.mandate = mandate
    stand.mandate.status = MandateStatus.PENDING
    stands[stand_id] = stand
    return stand


@app.put("/stands/{stand_id}/mandate/accept", response_model=Stand)
def accept_mandate(stand_id: int, agent: Agent = Depends(get_current_agent)):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    stand = stands[stand_id]
    if not stand.mandate or stand.mandate.agent != agent.username:
        raise HTTPException(status_code=403, detail="Not authorized to accept this mandate")
    stand.mandate.status = MandateStatus.ACCEPTED
    stands[stand_id] = stand
    return stand


@app.get("/stands/available", response_model=List[Stand])
def available_stands(agent: Agent = Depends(get_current_agent)):
    result = [s for s in stands.values() if s.status == PropertyStatus.AVAILABLE]
    if agent.role == "agent":
        result = [
            s
            for s in result
            if s.mandate and s.mandate.agent == agent.username and s.mandate.status == MandateStatus.ACCEPTED
        ]
    return result


# ---- Submission endpoints ----


def _ensure_owner(obj_realtor: str, agent: Agent):
    if agent.role != "admin" and obj_realtor != agent.username:
        raise HTTPException(status_code=403, detail="Not authorized")


@app.post("/offers", response_model=Offer)
def submit_offer(offer: Offer, agent: Agent = Depends(get_current_agent)):
    if offer.id in offers:
        raise HTTPException(status_code=400, detail="Offer ID exists")
    if agent.username != offer.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    offers[offer.id] = offer
    notifications.append(f"Offer {offer.id} submitted by {offer.realtor}")
    return offer


@app.get("/offers/{offer_id}", response_model=Offer)
def get_offer(offer_id: int, agent: Agent = Depends(get_current_agent)):
    if offer_id not in offers:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer = offers[offer_id]
    _ensure_owner(offer.realtor, agent)
    return offer


@app.put("/offers/{offer_id}/status", response_model=Offer)
def update_offer_status(offer_id: int, update: StatusUpdate, _: Agent = Depends(require_admin)):
    if offer_id not in offers:
        raise HTTPException(status_code=404, detail="Offer not found")
    offer = offers[offer_id]
    offer.status = update.status
    offers[offer_id] = offer
    return offer


@app.post("/property-applications", response_model=PropertyApplication)
def submit_property_application(application: PropertyApplication, agent: Agent = Depends(get_current_agent)):
    if application.id in applications:
        raise HTTPException(status_code=400, detail="Application ID exists")
    if agent.username != application.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    applications[application.id] = application
    notifications.append(f"Property application {application.id} submitted by {application.realtor}")
    return application


@app.get("/property-applications/{app_id}", response_model=PropertyApplication)
def get_property_application(app_id: int, agent: Agent = Depends(get_current_agent)):
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    application = applications[app_id]
    _ensure_owner(application.realtor, agent)
    return application


@app.put("/property-applications/{app_id}/status", response_model=PropertyApplication)
def update_property_application_status(app_id: int, update: StatusUpdate, _: Agent = Depends(require_admin)):
    if app_id not in applications:
        raise HTTPException(status_code=404, detail="Application not found")
    application = applications[app_id]
    application.status = update.status
    applications[app_id] = application
    return application


@app.post("/account-openings", response_model=AccountOpening)
def submit_account_opening(request: AccountOpening, agent: Agent = Depends(get_current_agent)):
    if request.id in account_openings:
        raise HTTPException(status_code=400, detail="Request ID exists")
    if agent.username != request.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    account_openings[request.id] = request
    notifications.append(f"Account opening {request.id} submitted by {request.realtor}")
    return request


@app.get("/account-openings/{req_id}", response_model=AccountOpening)
def get_account_opening(req_id: int, agent: Agent = Depends(get_current_agent)):
    if req_id not in account_openings:
        raise HTTPException(status_code=404, detail="Request not found")
    request = account_openings[req_id]
    _ensure_owner(request.realtor, agent)
    return request


@app.put("/account-openings/{req_id}/status", response_model=AccountOpening)
def update_account_opening_status(req_id: int, update: StatusUpdate, _: Agent = Depends(require_admin)):
    if req_id not in account_openings:
        raise HTTPException(status_code=404, detail="Request not found")
    request = account_openings[req_id]
    request.status = update.status
    account_openings[req_id] = request
    return request


@app.put("/account-openings/{req_id}/open", response_model=AccountOpening)
def open_account(req_id: int, details: AccountSetup, _: Agent = Depends(require_admin)):
    if req_id not in account_openings:
        raise HTTPException(status_code=404, detail="Request not found")
    request = account_openings[req_id]
    request.account_number = details.account_number
    request.deposit_threshold = details.deposit_threshold
    request.status = SubmissionStatus.IN_PROGRESS
    account_openings[req_id] = request
    return request


@app.post("/account-openings/{req_id}/deposit", response_model=AccountOpening)
def record_deposit(req_id: int, deposit: Deposit, _: Agent = Depends(require_admin)):
    if req_id not in account_openings:
        raise HTTPException(status_code=404, detail="Request not found")
    request = account_openings[req_id]
    request.deposits.append(deposit.amount)
    if request.deposit_threshold is not None and sum(request.deposits) >= request.deposit_threshold:
        request.status = SubmissionStatus.COMPLETED
    account_openings[req_id] = request
    return request


@app.post("/loan-applications", response_model=LoanApplication)
def submit_loan_application(
    application: LoanApplication, agent: Agent = Depends(get_current_agent)
):
    if application.id in loan_applications:
        raise HTTPException(status_code=400, detail="Loan application ID exists")
    if agent.username != application.realtor:
        raise HTTPException(status_code=403, detail="Cannot submit for another realtor")
    if application.account_id not in account_openings:
        raise HTTPException(status_code=404, detail="Account not found")
    account = account_openings[application.account_id]
    if account.status != SubmissionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Deposits not sufficient for loan application")
    if not application.documents:
        raise HTTPException(status_code=400, detail="Documentation required")
    loan_applications[application.id] = application
    notifications.append(
        f"Loan application {application.id} submitted by {application.realtor}"
    )
    return application


@app.get("/loan-applications/{app_id}", response_model=LoanApplication)
def get_loan_application(app_id: int, agent: Agent = Depends(get_current_agent)):
    if app_id not in loan_applications:
        raise HTTPException(status_code=404, detail="Loan application not found")
    application = loan_applications[app_id]
    _ensure_owner(application.realtor, agent)
    return application


@app.put("/loan-applications/{app_id}/decision", response_model=LoanApplication)
def decide_loan_application(
    app_id: int, decision: LoanDecisionUpdate, _: Agent = Depends(require_admin)
):
    if app_id not in loan_applications:
        raise HTTPException(status_code=404, detail="Loan application not found")
    application = loan_applications[app_id]
    application.decision = decision.decision
    application.reason = decision.reason
    if decision.decision == LoanDecision.APPROVED:
        application.status = SubmissionStatus.COMPLETED
    else:
        application.status = SubmissionStatus.REJECTED
    loan_applications[app_id] = application
    return application


@app.get("/notifications", response_model=List[str])
def list_notifications(_: Agent = Depends(require_admin)):
    return notifications
