from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..dependencies import require_roles
from ..database import get_db
from ..models import entities
from ..schemas.common import ProjectCreate, ProjectOut

router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(require_roles(["System Admin", "Property Manager"]))])


@router.post("", response_model=ProjectOut)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = entities.Project(**payload.dict())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(entities.Project).all()
