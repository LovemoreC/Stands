from fastapi import FastAPI, HTTPException
from typing import Dict, List
from .models import Project, Stand, PropertyStatus, Mandate

app = FastAPI(title="Property Management API")

# In-memory stores
projects: Dict[int, Project] = {}
stands: Dict[int, Stand] = {}


@app.post("/projects", response_model=Project)
def create_project(project: Project):
    if project.id in projects:
        raise HTTPException(status_code=400, detail="Project ID exists")
    projects[project.id] = project
    return project


@app.get("/projects", response_model=List[Project])
def list_projects():
    return list(projects.values())


@app.post("/stands", response_model=Stand)
def create_stand(stand: Stand):
    if stand.id in stands:
        raise HTTPException(status_code=400, detail="Stand ID exists")
    if stand.project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    stands[stand.id] = stand
    return stand


@app.put("/stands/{stand_id}", response_model=Stand)
def update_stand(stand_id: int, stand: Stand):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    stands[stand_id] = stand
    return stand


@app.delete("/stands/{stand_id}", response_model=Stand)
def archive_stand(stand_id: int):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    stand = stands[stand_id]
    stand.status = PropertyStatus.ARCHIVED
    stands[stand_id] = stand
    return stand


@app.post("/stands/{stand_id}/mandate", response_model=Stand)
def assign_mandate(stand_id: int, mandate: Mandate):
    if stand_id not in stands:
        raise HTTPException(status_code=404, detail="Stand not found")
    stand = stands[stand_id]
    stand.mandate_agent = mandate.agent
    stands[stand_id] = stand
    return stand
