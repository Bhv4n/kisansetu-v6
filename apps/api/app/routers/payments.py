import uuid
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.contract import Contract
from app.models.core import BuyerProfile, SellerProfile
from app.models.ops import Payment
from app.services.audit import log_action, notify
from app.core.authz import get_contract_scoped

router = APIRouter(prefix="/api/v1", tags=["payments"])


def serialize(p: Payment):
    return {
        "id": str(p.id),
        "contract_id": str(p.contract_id),
        "milestone_id": str(p.milestone_id) if p.milestone_id else None,
        "amount": float(p.amount),
        "currency": p.currency,
        "status": p.status,
        "provider_ref": p.provider_ref,
        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        "created_at": p.created_at.isoformat(),
    }


@router.get("/contracts/{contract_id}/payments")
def list_contract_payments(contract_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    get_contract_scoped(db, contract_id, user)
    rows = db.query(Payment).filter(Payment.contract_id == contract_id).order_by(Payment.created_at).all()
    return [serialize(p) for p in rows]


@router.post("/payments/simulate")
def simulate_payment(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    contract = get_contract_scoped(db, uuid.UUID(payload["contract_id"]), user)
    buyer = db.get(BuyerProfile, contract.buyer_id)
    seller = db.get(SellerProfile, contract.seller_id)

    payment = Payment(
        contract_id=contract.id,
        milestone_id=payload.get("milestone_id"),
        payer_id=buyer.user_id,
        payee_id=seller.user_id,
        amount=payload.get("amount", contract.total_value),
        status="PROCESSING",
        provider_ref=f"SIM-{secrets.token_hex(6).upper()}",
    )
    db.add(payment)
    db.flush()
    log_action(db, user.id, "PAYMENT_CREATED", "payment", payment.id, after={"amount": float(payment.amount)})
    db.commit()
    db.refresh(payment)
    return serialize(payment)


@router.post("/payments/{payment_id}/confirm")
def confirm_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, "Payment not found")
    get_contract_scoped(db, payment.contract_id, user)
    payment.status = "PAID"
    payment.paid_at = datetime.now(timezone.utc)
    contract = db.get(Contract, payment.contract_id)
    log_action(db, user.id, "PAYMENT_COMPLETED", "payment", payment.id, after={"amount": float(payment.amount)})
    notify(db, payment.payee_id, "Payment received", f"₹{payment.amount} received for {contract.contract_no}", f"/seller/contracts/{contract.id}/payments")
    notify(db, payment.payer_id, "Payment completed", f"₹{payment.amount} paid for {contract.contract_no}", f"/buyer/contracts/{contract.id}/payments")
    db.commit()
    return serialize(payment)
