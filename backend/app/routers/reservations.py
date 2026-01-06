from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..dependencies import get_current_user, require_roles
from ..database import get_db
from ..models import entities
from ..schemas.common import ReservationCreate, ReservationOut

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.post("", response_model=ReservationOut, dependencies=[Depends(require_roles(["Realtor", "Property Manager", "System Admin"]))])
def create_reservation(payload: ReservationCreate, db: Session = Depends(get_db)):
    stand = db.query(entities.Stand).filter(entities.Stand.id == payload.stand_id).first()
    if not stand:
        raise HTTPException(status_code=404, detail="Stand not found")
    if stand.status != entities.StandStatus.AVAILABLE:
        raise HTTPException(status_code=400, detail="Stand not available")
    reservation = entities.Reservation(**payload.dict())
    stand.status = entities.StandStatus.RESERVED
    db.add(reservation)
    db.commit()
    db.refresh(reservation)
    return reservation


@router.get("", response_model=list[ReservationOut])
def list_reservations(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(entities.Reservation)
    if current_user.role == "Realtor":
        query = query.filter(entities.Reservation.realtor_id == current_user.id)
    return query.all()


@router.post("/{reservation_id}/approve", response_model=ReservationOut, dependencies=[Depends(require_roles(["Property Manager", "System Admin"]))])
def approve_reservation(reservation_id: int, db: Session = Depends(get_db)):
    reservation = db.query(entities.Reservation).filter(entities.Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation.status = entities.ReservationStatus.APPROVED
    reservation.stand.status = entities.StandStatus.RESERVED
    db.commit()
    db.refresh(reservation)
    return reservation


@router.post("/{reservation_id}/reject", response_model=ReservationOut, dependencies=[Depends(require_roles(["Property Manager", "System Admin"]))])
def reject_reservation(reservation_id: int, db: Session = Depends(get_db)):
    reservation = db.query(entities.Reservation).filter(entities.Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation.status = entities.ReservationStatus.REJECTED
    reservation.stand.status = entities.StandStatus.AVAILABLE
    db.commit()
    db.refresh(reservation)
    return reservation


@router.post("/{reservation_id}/expire", response_model=ReservationOut, dependencies=[Depends(require_roles(["Property Manager", "System Admin"]))])
def expire_reservation(reservation_id: int, db: Session = Depends(get_db)):
    reservation = db.query(entities.Reservation).filter(entities.Reservation.id == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    reservation.status = entities.ReservationStatus.EXPIRED
    reservation.stand.status = entities.StandStatus.AVAILABLE
    reservation.expiry_date = date.today()
    db.commit()
    db.refresh(reservation)
    return reservation
