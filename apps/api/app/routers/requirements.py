import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.deal import BuyerRequirement
from app.models.core import BuyerProfile, User
from app.models.catalog import Product
from app.services.audit import log_action
from app.core.authz import assert_requirement_party

router = APIRouter(prefix="/api/v1/buyer-requirements", tags=["requirements"])


def serialize(r: BuyerRequirement):
    return {
        "id": str(r.id),
        "buyer_id": str(r.buyer_id),
        "product_id": str(r.product_id) if r.product_id else None,
        "product_name": r.product_name,
        "quantity": float(r.quantity),
        "unit": r.unit,
        "target_price": float(r.target_price) if r.target_price else None,
        "delivery_location": r.delivery_location,
        "delivery_from": r.delivery_from.isoformat() if r.delivery_from else None,
        "delivery_to": r.delivery_to.isoformat() if r.delivery_to else None,
        "quality_requirement": r.quality_requirement,
        "notes": r.notes,
        "status": r.status,
        "created_at": r.created_at.isoformat(),
    }


@router.post("")
def create_requirement(payload: dict, db: Session = Depends(get_db), user: User = Depends(require_roles("BUYER"))):
    buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
    if not buyer:
        raise HTTPException(400, "Buyer profile not found")
    product_id = payload.get("product_id")
    product_name = payload.get("product_name")
    if product_id and not product_name:
        p = db.get(Product, uuid.UUID(product_id))
        product_name = p.name if p else "Unknown"
    r = BuyerRequirement(
        buyer_id=buyer.id,
        product_id=product_id,
        product_name=product_name,
        quantity=payload["quantity"],
        unit=payload.get("unit", "kg"),
        target_price=payload.get("target_price"),
        delivery_location=payload.get("delivery_location"),
        delivery_from=payload.get("delivery_from") or None,
        delivery_to=payload.get("delivery_to") or None,
        quality_requirement=payload.get("quality_requirement"),
        notes=payload.get("notes"),
        status="OPEN",
    )
    db.add(r)
    db.flush()
    log_action(db, user.id, "REQUIREMENT_CREATED", "buyer_requirement", r.id, after={"product_name": r.product_name})
    db.commit()
    return serialize(r)


@router.get("")
def list_requirements(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: str | None = None,
    mine: bool = True,
):
    query = db.query(BuyerRequirement)
    if user.role == "BUYER" and mine:
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        query = query.filter(BuyerRequirement.buyer_id == buyer.id)
    elif user.role in ("SELLER", "FPO_MANAGER"):
        # Opportunities: open requirements available to sellers
        query = query.filter(BuyerRequirement.status.in_(["OPEN", "QUOTES_RECEIVED", "NEGOTIATING"]))
    if status_filter:
        query = query.filter(BuyerRequirement.status == status_filter)
    rows = query.order_by(BuyerRequirement.created_at.desc()).all()
    return [serialize(r) for r in rows]


@router.get("/{req_id}")
def get_requirement(req_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    r = db.get(BuyerRequirement, req_id)
    if not r:
        raise HTTPException(404, "Requirement not found")
    assert_requirement_party(db, r, user)
    return serialize(r)
