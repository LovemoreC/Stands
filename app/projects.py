from typing import List
from fastapi import HTTPException
from .models import Project, Stand, PropertyStatus
from .repositories import Repositories


class ProjectsService:
    """Service layer for project and stand operations."""

    def __init__(self, repos: Repositories):
        self.repos = repos

    # Project methods
    def list_projects(self) -> List[Project]:
        return self.repos.projects.list()

    def create_project(self, project: Project) -> Project:
        if self.repos.projects.get(project.id):
            raise HTTPException(status_code=400, detail="Project ID exists")
        self.repos.projects.add(project)
        return project

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
        self.repos.projects.delete(project_id)
        return project

    # Stand methods
    def list_stands(self, project_id: int) -> List[Stand]:
        if not self.repos.projects.get(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        return [s for s in self.repos.stands.list() if s.project_id == project_id]

    def create_stand(self, project_id: int, stand: Stand) -> Stand:
        if not self.repos.projects.get(project_id):
            raise HTTPException(status_code=404, detail="Project not found")
        if self.repos.stands.get(stand.id):
            raise HTTPException(status_code=400, detail="Stand ID exists")
        if stand.project_id != project_id:
            raise HTTPException(status_code=400, detail="Project mismatch")
        self.repos.stands.add(stand)
        return stand

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
