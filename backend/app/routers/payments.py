from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..dependencies import require_roles
from ..database import get_db
from ..models import entities
from ..schemas.common import PaymentPlanCreate, PaymentPlanOut, PaymentCreate, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])

@router.get("/plans", response_model=list[PaymentPlanOut], dependencies=[Depends(require_roles(["Credit Manager", "System Admin"]))])
def list_payment_plans(db: Session = Depends(get_db)):
    return db.query(entities.PaymentPlan).all()


@router.post("/plans", response_model=PaymentPlanOut, dependencies=[Depends(require_roles(["Credit Manager", "System Admin"]))])
def create_payment_plan(payload: PaymentPlanCreate, db: Session = Depends(get_db)):
    sale = db.query(entities.Sale).filter(entities.Sale.id == payload.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    plan = entities.PaymentPlan(**payload.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("", response_model=PaymentOut, dependencies=[Depends(require_roles(["Credit Manager", "System Admin"]))])
def record_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    sale = db.query(entities.Sale).filter(entities.Sale.id == payload.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    payment = entities.Payment(**payload.dict())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("", response_model=list[PaymentOut], dependencies=[Depends(require_roles(["Credit Manager", "System Admin"]))])
def list_payments(db: Session = Depends(get_db)):
    return db.query(entities.Payment).all()
