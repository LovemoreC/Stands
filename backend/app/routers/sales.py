from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..dependencies import require_roles
from ..database import get_db
from ..models import entities
from ..schemas.common import SaleCreate, SaleOut

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleOut], dependencies=[Depends(require_roles(["Property Manager", "Credit Manager", "System Admin"]))])
def list_sales(db: Session = Depends(get_db)):
    return db.query(entities.Sale).all()


@router.post("", response_model=SaleOut, dependencies=[Depends(require_roles(["Property Manager", "System Admin"]))])
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    stand = db.query(entities.Stand).filter(entities.Stand.id == payload.stand_id).first()
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.status not in [entities.StandStatus.AVAILABLE, entities.StandStatus.RESERVED]:
        raise HTTPException(status_code=400, detail="Stand cannot be sold")
    sale = entities.Sale(**payload.dict())
    stand.status = entities.StandStatus.SOLD
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


@router.post("/{sale_id}/complete", response_model=SaleOut, dependencies=[Depends(require_roles(["Credit Manager", "System Admin"]))])
def complete_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(entities.Sale).filter(entities.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    sale.status = entities.SaleStatus.COMPLETED
    db.commit()
    db.refresh(sale)
    return sale
