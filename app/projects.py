from typing import List
from fastapi import HTTPException
from .models import Project, ProjectCreate, Stand, StandCreate, PropertyStatus
from .repositories import Repositories


class ProjectsService:
    """Service layer for project and stand operations."""

    def __init__(self, repos: Repositories):
        self.repos = repos

    # Project methods
    def list_projects(self) -> List[Project]:
        return self.repos.projects.list()

    def _allocate_project_id(self) -> int:
        next_id = self.repos.counters.get("next_project_id")
        if next_id is None:
            next_id = max((p.id for p in self.repos.projects.list()), default=0) + 1
        self.repos.counters.set("next_project_id", next_id + 1)
        return next_id

    def _allocate_stand_id(self) -> int:
        next_id = self.repos.counters.get("next_stand_id")
        if next_id is None:
            next_id = max((s.id for s in self.repos.stands.list()), default=0) + 1
        self.repos.counters.set("next_stand_id", next_id + 1)
        return next_id

    def create_project(self, project: ProjectCreate) -> Project:
        project_id = self._allocate_project_id()
        project_record = Project(id=project_id, **project.model_dump())
        self.repos.projects.add(project_record)
        return project_record

    def update_project(self, project_id: int, project: Project) -> Project:
        existing = self.repos.projects.get(project_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Project not found")
        if project.id != project_id:
            raise HTTPException(status_code=400, detail="Project ID mismatch")
        self.repos.projects.add(project)
        return project

    def delete_project(self, project_id: int) -> Project:
        project = self.repos.projects.get(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        stands = [s for s in self.repos.stands.list() if s.project_id == project_id]
        if stands:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete project with existing stands",
            )
        self.repos.projects.delete(project_id)
        return project

    # Stand methods
    def list_stands(self, project_id: int) -> List[Stand]:
        if not self.repos.projects.get(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return [s for s in self.repos.stands.list() if s.project_id == project_id]

    def create_stand(self, project_id: int, stand: StandCreate) -> Stand:
        if not self.repos.projects.get(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        if stand.project_id != project_id:
            raise HTTPException(status_code=400, detail="Project mismatch")
        stand_id = self._allocate_stand_id()
        stand_record = Stand(id=stand_id, **stand.model_dump())
        self.repos.stands.add(stand_record)
        return stand_record

    def update_stand(self, project_id: int, stand_id: int, stand: Stand) -> Stand:
        if not self.repos.projects.get(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        existing = self.repos.stands.get(stand_id)
        if not existing or existing.project_id != project_id:
            raise HTTPException(status_code=404, detail="Stand not found")
        if existing.status == PropertyStatus.SOLD:
            raise HTTPException(status_code=400, detail="Stand already sold")
        if stand.id != stand_id or stand.project_id != project_id:
            raise HTTPException(status_code=400, detail="Stand mismatch")
        self.repos.stands.add(stand)
        return stand

    def delete_stand(self, project_id: int, stand_id: int) -> Stand:
        if not self.repos.projects.get(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        stand = self.repos.stands.get(stand_id)
        if not stand or stand.project_id != project_id:
            raise HTTPException(status_code=404, detail="Stand not found")
        if stand.status == PropertyStatus.SOLD:
            raise HTTPException(status_code=400, detail="Stand already sold")
        self.repos.stands.delete(stand_id)
        return stand
