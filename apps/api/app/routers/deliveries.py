import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.authz import get_contract_scoped
from app.models.contract import Delivery
from app.services.audit import log_action, notify
from app.models.core import BuyerProfile, SellerProfile

router = APIRouter(prefix="/api/v1", tags=["deliveries"])


def serialize(d: Delivery):
    return {
        "id": str(d.id), "contract_id": str(d.contract_id), "lot_id": str(d.lot_id) if d.lot_id else None,
        "quantity": float(d.quantity), "unit": d.unit, "origin": d.origin, "destination": d.destination,
        "dispatch_date": d.dispatch_date.isoformat() if d.dispatch_date else None,
        "expected_delivery_date": d.expected_delivery_date.isoformat() if d.expected_delivery_date else None,
        "actual_delivery_date": d.actual_delivery_date.isoformat() if d.actual_delivery_date else None,
        "status": d.status, "delay_reason": d.delay_reason,
    }


@router.get("/contracts/{contract_id}/deliveries")
def list_contract_deliveries(contract_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    get_contract_scoped(db, contract_id, user)
    rows = db.query(Delivery).filter(Delivery.contract_id == contract_id).order_by(Delivery.created_at).all()
    return [serialize(d) for d in rows]


@router.post("/deliveries")
def create_delivery(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    contract = get_contract_scoped(db, uuid.UUID(payload["contract_id"]), user)
    d = Delivery(
        contract_id=contract.id, lot_id=payload.get("lot_id"),
        quantity=payload.get("quantity", contract.quantity), unit=payload.get("unit", contract.unit),
        origin=payload.get("origin"), destination=payload.get("destination"),
        dispatch_date=datetime.now(timezone.utc), status="DISPATCHED",
    )
    db.add(d)
    db.flush()
    log_action(db, user.id, "DELIVERY_DISPATCHED", "delivery", d.id, after={"contract": contract.contract_no})
    db.commit()
    return serialize(d)


@router.post("/deliveries/{delivery_id}/complete")
def complete_delivery(delivery_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = db.get(Delivery, delivery_id)
    if not d:
        raise HTTPException(404, "Delivery not found")
    contract = get_contract_scoped(db, d.contract_id, user)
    d.actual_delivery_date = datetime.now(timezone.utc)
    d.status = "DELIVERED"
    buyer = db.get(BuyerProfile, contract.buyer_id)
    seller = db.get(SellerProfile, contract.seller_id)
    log_action(db, user.id, "DELIVERY_COMPLETED", "delivery", d.id)
    notify(db, buyer.user_id, "Delivery completed", f"Contract {contract.contract_no}", f"/buyer/contracts/{contract.id}")
    notify(db, seller.user_id, "Delivery completed", f"Contract {contract.contract_no}", f"/seller/contracts/{contract.id}")
    db.commit()
    return serialize(d)
