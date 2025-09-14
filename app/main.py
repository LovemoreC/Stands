from fastapi import FastAPI, HTTPException, Depends, Header
from typing import Dict, List
from .models import (
    Project,
    Stand,
    PropertyStatus,
    Mandate,
    Agent,
    MandateStatus,
)

app = FastAPI(title="Property Management API")

# In-memory stores
projects: Dict[int, Project] = {}
stands: Dict[int, Stand] = {}
agents: Dict[str, Agent] = {}


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
