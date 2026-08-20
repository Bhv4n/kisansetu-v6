import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.contract import Contract, Lot, Inspection, InspectionResult, ContractMilestone, Delivery
from app.models.core import BuyerProfile, SellerProfile, Farm, User
from app.models.ops import Payment
from app.services.audit import log_action
from app.core.authz import get_contract_scoped

router = APIRouter(prefix="/api/v1/lots", tags=["lots"])


def _gen_lot_code(contract: Contract, seq: int) -> str:
    return f"LOT-{contract.contract_no}-{seq:02d}"


@router.post("")
def create_lot(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    contract = get_contract_scoped(db, uuid.UUID(payload["contract_id"]), user)
    existing_count = db.query(Lot).filter(Lot.contract_id == contract.id).count()
    lot = Lot(
        contract_id=contract.id,
        product_id=payload.get("product_id"),
        lot_code=_gen_lot_code(contract, existing_count + 1),
        quantity=payload.get("quantity", contract.quantity),
        unit=payload.get("unit", contract.unit),
        qr_token=secrets.token_urlsafe(16),
    )
    db.add(lot)
    db.flush()
    log_action(db, user.id, "LOT_CREATED", "lot", lot.id, after={"lot_code": lot.lot_code})
    db.commit()
    return {"id": str(lot.id), "lot_code": lot.lot_code, "qr_token": lot.qr_token}


@router.get("/{lot_code}")
def get_lot(lot_code: str, db: Session = Depends(get_db)):
    """The 'Produce Passport' — everything a QR scan should show, public and
    unauthenticated (same trust model as scanning a real product QR code)."""
    lot = db.query(Lot).filter(Lot.lot_code == lot_code).first()
    if not lot:
        raise HTTPException(404, "Lot not found")
    contract = db.get(Contract, lot.contract_id)
    buyer = db.get(BuyerProfile, contract.buyer_id)
    seller = db.get(SellerProfile, contract.seller_id)
    farm = db.query(Farm).filter(Farm.seller_id == seller.id).first() if seller else None
    inspections = db.query(Inspection).filter(Inspection.lot_id == lot.id).all()
    milestones = db.query(ContractMilestone).filter(ContractMilestone.contract_id == contract.id).order_by(ContractMilestone.created_at).all()
    delivery = db.query(Delivery).filter(Delivery.lot_id == lot.id).first() or db.query(Delivery).filter(Delivery.contract_id == contract.id).first()
    payment = db.query(Payment).filter(Payment.contract_id == contract.id).order_by(Payment.created_at.desc()).first()

    def _inspector_name(insp):
        if not insp.assigned_to:
            return None
        u = db.get(User, insp.assigned_to)
        return u.full_name if u else None

    return {
        "lot_code": lot.lot_code,
        "quantity": float(lot.quantity),
        "unit": lot.unit,
        "product_name": contract.product_name,
        "quality_grade": contract.quality_grade,
        "contract_no": contract.contract_no,
        "buyer_name": buyer.business_name if buyer else None,
        "seller_name": seller.display_name if seller else None,
        "seller_location": seller.city if seller else None,
        "seller_state": seller.state if seller else None,
        "farm_name": farm.name if farm else None,
        "farm_area_acres": float(farm.area_acres) if farm and farm.area_acres else None,
        "contract_status": contract.status,
        "timeline": [
            {
                "milestone": m.milestone_type, "status": m.status,
                "completed_at": m.completed_at.isoformat() if m.completed_at else None,
            } for m in milestones
        ],
        "inspections": [
            {
                "status": i.status, "notes": i.notes,
                "inspected_at": i.inspected_at.isoformat() if i.inspected_at else None,
                "inspector_name": _inspector_name(i),
                "results": [
                    {"parameter": r.parameter, "measured_value": r.measured_value, "result": r.result}
                    for r in db.query(InspectionResult).filter(InspectionResult.inspection_id == i.id).all()
                ],
            }
            for i in inspections
        ],
        "delivery": {
            "status": delivery.status, "origin": delivery.origin, "destination": delivery.destination,
            "dispatch_date": delivery.dispatch_date.isoformat() if delivery.dispatch_date else None,
            "expected_delivery_date": delivery.expected_delivery_date.isoformat() if delivery.expected_delivery_date else None,
            "actual_delivery_date": delivery.actual_delivery_date.isoformat() if delivery.actual_delivery_date else None,
            "delay_reason": delivery.delay_reason,
        } if delivery else None,
        "payment_status": payment.status if payment else None,
        "created_at": lot.created_at.isoformat(),
    }
