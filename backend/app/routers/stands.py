from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..dependencies import get_current_user, require_roles
from ..database import get_db
from ..models import entities
from ..schemas.common import StandCreate, StandOut

router = APIRouter(prefix="/stands", tags=["stands"])


@router.get("", response_model=list[StandOut])
def list_stands(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(entities.Stand).all()


@router.post("", response_model=StandOut, dependencies=[Depends(require_roles(["System Admin", "Property Manager"]))])
def create_stand(payload: StandCreate, db: Session = Depends(get_db)):
    project = db.query(entities.Project).filter(entities.Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stand = entities.Stand(**payload.dict())
    db.add(stand)
    db.commit()
    db.refresh(stand)
    return stand


@router.put("/{stand_id}", response_model=StandOut, dependencies=[Depends(require_roles(["System Admin", "Property Manager"]))])
def update_stand(stand_id: int, payload: StandCreate, db: Session = Depends(get_db)):
    stand = db.query(entities.Stand).filter(entities.Stand.id == stand_id).first()
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    for key, value in payload.dict().items():
        setattr(stand, key, value)
    db.commit()
    db.refresh(stand)
    return stand
