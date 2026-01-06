from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..dependencies import require_roles
from ..database import get_db
from ..models import entities
from ..schemas.common import UserCreate, UserOut
from ..core.security import get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/users", response_model=UserOut, dependencies=[Depends(require_roles(["System Admin"]))])
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    hashed_pw = get_password_hash(payload.password)
    user = entities.User(
        name=payload.name,
        email=payload.email,
        role=payload.role,
        password_hash=hashed_pw,
        active=payload.active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserOut], dependencies=[Depends(require_roles(["System Admin"]))])
def list_users(db: Session = Depends(get_db)):
    return db.query(entities.User).all()
