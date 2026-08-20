import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.contract import Contract, ContractMilestone, Lot, Inspection, MILESTONE_SEQUENCE, CONTRACT_STATUSES
from app.models.core import BuyerProfile, SellerProfile, User
from app.models.ops import Payment
from app.services.audit import log_action, notify
from app.core.authz import get_contract_scoped, assert_contract_party

router = APIRouter(prefix="/api/v1/contracts", tags=["contracts"])

NEXT_STATUS_BY_MILESTONE = {
    "CONTRACT_ACCEPTED": "ACCEPTED",
    "PRODUCTION_STARTED": "GROWING",
    "READY_FOR_PICKUP": "READY",
    "PICKUP": "PICKED_UP",
    "QUALITY_INSPECTION": "INSPECTED",
    "DELIVERY": "DELIVERED",
    "PAYMENT": "PAID",
}


def serialize_contract(c: Contract, db: Session, detailed=False):
    base = {
        "id": str(c.id),
        "contract_no": c.contract_no,
        "buyer_id": str(c.buyer_id),
        "seller_id": str(c.seller_id),
        "product_name": c.product_name,
        "quantity": float(c.quantity),
        "unit": c.unit,
        "unit_price": float(c.unit_price),
        "total_value": float(c.total_value),
        "quality_grade": c.quality_grade,
        "delivery_terms": c.delivery_terms,
        "payment_terms": c.payment_terms,
        "status": c.status,
        "created_at": c.created_at.isoformat(),
    }
    if not detailed:
        return base

    buyer = db.get(BuyerProfile, c.buyer_id)
    seller = db.get(SellerProfile, c.seller_id)
    milestones = db.query(ContractMilestone).filter(ContractMilestone.contract_id == c.id).order_by(ContractMilestone.created_at).all()
    lots = db.query(Lot).filter(Lot.contract_id == c.id).all()
    payments = db.query(Payment).filter(Payment.contract_id == c.id).all()
    inspections = db.query(Inspection).filter(Inspection.contract_id == c.id).all()

    base.update({
        "buyer_name": buyer.business_name if buyer else None,
        "seller_name": seller.display_name if seller else None,
        "milestones": [
            {
                "type": m.milestone_type, "status": m.status,
                "due_at": m.due_at.isoformat() if m.due_at else None,
                "completed_at": m.completed_at.isoformat() if m.completed_at else None,
            } for m in milestones
        ],
        "lots": [
            {"id": str(l.id), "lot_code": l.lot_code, "qr_token": l.qr_token, "quantity": float(l.quantity), "unit": l.unit}
            for l in lots
        ],
        "payments": [
            {"id": str(p.id), "amount": float(p.amount), "status": p.status, "milestone_id": str(p.milestone_id) if p.milestone_id else None}
            for p in payments
        ],
        "inspections": [
            {"id": str(i.id), "status": i.status, "notes": i.notes} for i in inspections
        ],
    })
    return base


@router.get("")
def list_contracts(db: Session = Depends(get_db), user: User = Depends(get_current_user), status_filter: str | None = None):
    query = db.query(Contract)
    if user.role == "BUYER":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        query = query.filter(Contract.buyer_id == buyer.id)
    elif user.role in ("SELLER", "FPO_MANAGER"):
        seller = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        query = query.filter(Contract.seller_id == seller.id)
    if status_filter:
        query = query.filter(Contract.status == status_filter)
    rows = query.order_by(Contract.created_at.desc()).all()
    return [serialize_contract(c, db) for c in rows]


@router.get("/{contract_id}")
def get_contract(contract_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = get_contract_scoped(db, contract_id, user)
    return serialize_contract(c, db, detailed=True)


@router.post("/{contract_id}/accept")
def accept_contract(contract_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = get_contract_scoped(db, contract_id, user)
    if c.status not in ("DRAFT", "NEGOTIATING"):
        raise HTTPException(400, f"Cannot accept a contract in status {c.status}")
    c.status = "ACCEPTED"
    log_action(db, user.id, "CONTRACT_ACCEPTED", "contract", c.id)
    db.commit()
    return serialize_contract(c, db)


@router.post("/{contract_id}/milestones/{milestone_type}/complete")
def complete_milestone(contract_id: uuid.UUID, milestone_type: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = get_contract_scoped(db, contract_id, user)
    m = (
        db.query(ContractMilestone)
        .filter(ContractMilestone.contract_id == c.id, ContractMilestone.milestone_type == milestone_type.upper())
        .first()
    )
    if not m:
        raise HTTPException(404, "Milestone not found")
    if m.status == "DONE":
        return serialize_contract(c, db, detailed=True)

    m.status = "DONE"
    m.completed_at = datetime.now(timezone.utc)
    m.completed_by = user.id

    new_status = NEXT_STATUS_BY_MILESTONE.get(milestone_type.upper())
    if new_status:
        c.status = new_status
    if milestone_type.upper() == "PAYMENT":
        c.status = "COMPLETED"

    buyer = db.get(BuyerProfile, c.buyer_id)
    seller = db.get(SellerProfile, c.seller_id)
    log_action(db, user.id, "MILESTONE_COMPLETED", "contract_milestone", m.id, after={"type": milestone_type, "contract": c.contract_no})
    notify(db, buyer.user_id, f"Milestone updated: {milestone_type.replace('_',' ').title()}", f"Contract {c.contract_no}", f"/buyer/contracts/{c.id}")
    notify(db, seller.user_id, f"Milestone updated: {milestone_type.replace('_',' ').title()}", f"Contract {c.contract_no}", f"/seller/contracts/{c.id}")
    db.commit()
    return serialize_contract(c, db, detailed=True)
