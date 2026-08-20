import uuid
import hashlib
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.deal import Quote, QuoteVersion, BuyerRequirement
from app.models.core import SellerProfile, BuyerProfile, User
from app.models.contract import Contract, ContractMilestone, ContractVersion, MILESTONE_SEQUENCE
from app.models.ops import ChatThread
from app.services.audit import log_action, notify
from app.core.authz import assert_quote_party

router = APIRouter(prefix="/api/v1/quotes", tags=["quotes"])


def serialize_quote(q: Quote, db: Session):
    seller = db.get(SellerProfile, q.seller_id)
    req = db.get(BuyerRequirement, q.requirement_id)
    thread = db.query(ChatThread).filter(ChatThread.quote_id == q.id).first()
    return {
        "id": str(q.id),
        "requirement_id": str(q.requirement_id),
        "product_name": req.product_name if req else None,
        "seller_id": str(q.seller_id),
        "seller_name": seller.display_name if seller else None,
        "buyer_id": str(req.buyer_id) if req else None,
        "quantity": float(q.quantity),
        "unit_price": float(q.unit_price),
        "delivery_terms": q.delivery_terms,
        "payment_terms": q.payment_terms,
        "status": q.status,
        "thread_id": str(thread.id) if thread else None,
        "versions": [
            {
                "version_no": v.version_no,
                "terms": v.terms_json,
                "proposed_by_role": v.proposed_by_role,
                "created_at": v.created_at.isoformat(),
            }
            for v in q.versions
        ],
        "created_at": q.created_at.isoformat(),
    }


def _latest_terms(quote: Quote):
    return quote.versions[-1].terms_json if quote.versions else {
        "unit_price": float(quote.unit_price), "quantity": float(quote.quantity),
        "delivery_terms": quote.delivery_terms, "payment_terms": quote.payment_terms,
    }


@router.post("")
def submit_quote(payload: dict, db: Session = Depends(get_db), user: User = Depends(require_roles("SELLER", "FPO_MANAGER"))):
    seller = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
    if not seller:
        raise HTTPException(400, "Seller profile not found")
    req = db.get(BuyerRequirement, uuid.UUID(payload["requirement_id"]))
    if not req:
        raise HTTPException(404, "Requirement not found")

    q = Quote(
        requirement_id=req.id,
        seller_id=seller.id,
        quantity=payload.get("quantity", req.quantity),
        unit_price=payload["unit_price"],
        delivery_terms=payload.get("delivery_terms"),
        payment_terms=payload.get("payment_terms"),
        status="SUBMITTED",
    )
    db.add(q)
    db.flush()

    terms = {
        "unit_price": q.unit_price, "quantity": float(q.quantity),
        "delivery_terms": q.delivery_terms, "payment_terms": q.payment_terms,
    }
    db.add(QuoteVersion(quote_id=q.id, version_no=1, terms_json=terms, proposed_by_role="SELLER", created_by=user.id))

    if req.status == "OPEN":
        req.status = "QUOTES_RECEIVED"

    buyer_profile = db.get(BuyerProfile, req.buyer_id)
    thread = ChatThread(quote_id=q.id, buyer_id=req.buyer_id, seller_id=seller.id)
    db.add(thread)

    log_action(db, user.id, "QUOTE_CREATED", "quote", q.id, after=terms)
    notify(db, buyer_profile.user_id, "New quote received",
           f"{seller.display_name} quoted ₹{q.unit_price}/{q.unit if hasattr(q,'unit') else 'unit'} for {req.product_name}",
           f"/buyer/quotes/{q.id}")
    db.commit()
    db.refresh(q)
    return serialize_quote(q, db)


@router.get("")
def list_quotes(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role in ("SELLER", "FPO_MANAGER"):
        seller = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        rows = db.query(Quote).filter(Quote.seller_id == seller.id).order_by(Quote.created_at.desc()).all()
    elif user.role == "BUYER":
        buyer = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        req_ids = [r.id for r in db.query(BuyerRequirement).filter(BuyerRequirement.buyer_id == buyer.id).all()]
        rows = db.query(Quote).filter(Quote.requirement_id.in_(req_ids)).order_by(Quote.created_at.desc()).all() if req_ids else []
    else:
        rows = db.query(Quote).order_by(Quote.created_at.desc()).limit(100).all()
    return [serialize_quote(q, db) for q in rows]


@router.get("/{quote_id}")
def get_quote(quote_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.get(Quote, quote_id)
    if not q:
        raise HTTPException(404, "Quote not found")
    assert_quote_party(db, q, user)
    return serialize_quote(q, db)


@router.post("/{quote_id}/counter")
def counter_quote(quote_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.get(Quote, quote_id)
    if not q:
        raise HTTPException(404, "Quote not found")
    req = db.get(BuyerRequirement, q.requirement_id)
    seller = db.get(SellerProfile, q.seller_id)
    buyer = db.get(BuyerProfile, req.buyer_id)

    if user.role == "BUYER" and user.id != buyer.user_id:
        raise HTTPException(403, "Not your requirement")
    if user.role in ("SELLER", "FPO_MANAGER") and user.id != seller.user_id:
        raise HTTPException(403, "Not your quote")

    prev = _latest_terms(q)
    new_terms = {**prev, **{k: v for k, v in payload.items() if k in ("unit_price", "quantity", "delivery_terms", "payment_terms")}}
    version_no = (q.versions[-1].version_no + 1) if q.versions else 1
    proposer_role = "BUYER" if user.role == "BUYER" else "SELLER"

    db.add(QuoteVersion(quote_id=q.id, version_no=version_no, terms_json=new_terms, proposed_by_role=proposer_role, created_by=user.id))
    q.status = "COUNTERED"
    q.unit_price = new_terms["unit_price"]
    q.quantity = new_terms.get("quantity", q.quantity)
    q.delivery_terms = new_terms.get("delivery_terms")
    q.payment_terms = new_terms.get("payment_terms")
    if req.status != "NEGOTIATING":
        req.status = "NEGOTIATING"

    other_user_id = seller.user_id if proposer_role == "BUYER" else buyer.user_id
    log_action(db, user.id, "QUOTE_COUNTERED", "quote", q.id, before=prev, after=new_terms)
    notify(db, other_user_id, "Counter-offer received",
           f"New terms proposed: ₹{new_terms['unit_price']}/unit", f"/{'seller' if proposer_role=='BUYER' else 'buyer'}/quotes/{q.id}")
    db.commit()
    db.refresh(q)
    return serialize_quote(q, db)


@router.post("/{quote_id}/accept")
def accept_quote(quote_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.get(Quote, quote_id)
    if not q:
        raise HTTPException(404, "Quote not found")
    req = db.get(BuyerRequirement, q.requirement_id)
    seller = db.get(SellerProfile, q.seller_id)
    buyer = db.get(BuyerProfile, req.buyer_id)

    if user.id not in (buyer.user_id, seller.user_id):
        raise HTTPException(403, "Not authorized to accept this quote")

    q.status = "ACCEPTED"
    req.status = "CLOSED"

    terms = _latest_terms(q)
    total_value = float(terms["unit_price"]) * float(terms.get("quantity", q.quantity))
    contract_no = f"KS-{datetime.now(timezone.utc).strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"

    contract = Contract(
        contract_no=contract_no,
        buyer_id=buyer.id,
        seller_id=seller.id,
        requirement_id=req.id,
        quote_id=q.id,
        product_name=req.product_name,
        quantity=terms.get("quantity", q.quantity),
        unit=req.unit,
        unit_price=terms["unit_price"],
        total_value=total_value,
        quality_grade=(req.quality_requirement or {}).get("grade") if req.quality_requirement else None,
        delivery_terms=terms.get("delivery_terms"),
        payment_terms=terms.get("payment_terms"),
        status="ACCEPTED",
    )
    db.add(contract)
    db.flush()

    content_hash = hashlib.sha256(json.dumps(terms, sort_keys=True, default=str).encode()).hexdigest()
    db.add(ContractVersion(
        contract_id=contract.id, version_no=1, terms_json=terms, content_hash=content_hash,
        created_by=user.id, accepted_by=user.id, accepted_at=datetime.now(timezone.utc),
    ))

    now = datetime.now(timezone.utc)
    for i, m_type in enumerate(MILESTONE_SEQUENCE):
        db.add(ContractMilestone(
            contract_id=contract.id,
            milestone_type=m_type,
            status="DONE" if i == 0 else "PENDING",
            completed_at=now if i == 0 else None,
            completed_by=user.id if i == 0 else None,
        ))

    other_user_id = seller.user_id if user.id == buyer.user_id else buyer.user_id
    log_action(db, user.id, "QUOTE_ACCEPTED", "quote", q.id, after=terms)
    log_action(db, user.id, "CONTRACT_CREATED", "contract", contract.id, after={"contract_no": contract_no, "total_value": total_value})
    notify(db, other_user_id, "Contract created!", f"Contract {contract_no} has been created for {req.product_name}", f"/contracts/{contract.id}")
    db.commit()
    db.refresh(contract)
    return {"quote": serialize_quote(q, db), "contract_id": str(contract.id), "contract_no": contract.contract_no}
