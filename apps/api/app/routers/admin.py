from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_roles
from app.models.core import User, BuyerProfile, SellerProfile
from app.models.deal import BuyerRequirement
from app.models.contract import Contract, Inspection
from app.models.ops import Payment, Dispute, AuditLog, RiskEvent
from app.models.catalog import MarketPrice
from app.models.contract import Delivery

router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_roles("ADMIN"))])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar()
    buyers = db.query(func.count(User.id)).filter(User.role == "BUYER").scalar()
    sellers = db.query(func.count(User.id)).filter(User.role.in_(["SELLER", "FPO_MANAGER"])).scalar()
    active_contracts = db.query(func.count(Contract.id)).filter(~Contract.status.in_(["COMPLETED", "CANCELLED", "DRAFT"])).scalar()
    completed_contracts = db.query(func.count(Contract.id)).filter(Contract.status == "COMPLETED").scalar()
    open_requirements = db.query(func.count(BuyerRequirement.id)).filter(BuyerRequirement.status == "OPEN").scalar()
    total_payments_value = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "PAID").scalar()
    pending_payments = db.query(func.count(Payment.id)).filter(Payment.status.in_(["DUE", "PROCESSING"])).scalar()
    inspections_total = db.query(func.count(Inspection.id)).scalar()
    open_disputes = db.query(func.count(Dispute.id)).filter(Dispute.status.in_(["OPEN", "IN_REVIEW"])).scalar()

    # Procurement Overview — real aggregates, not placeholders
    total_procurement_value = db.query(func.coalesce(func.sum(Contract.total_value), 0)).filter(
        ~Contract.status.in_(["DRAFT", "CANCELLED"])
    ).scalar()
    non_draft_contracts = db.query(func.count(Contract.id)).filter(Contract.status != "DRAFT").scalar()
    fulfillment_rate = round((completed_contracts / non_draft_contracts * 100), 1) if non_draft_contracts else 0.0
    pass_inspections = db.query(func.count(Inspection.id)).filter(Inspection.status == "PASS").scalar()
    avg_quality = round((pass_inspections / inspections_total * 100), 1) if inspections_total else 0.0
    at_risk_value = db.query(func.coalesce(func.sum(Contract.total_value), 0)).filter(Contract.status == "AT_RISK").scalar()

    from app.services import intelligence as intel
    sample_contracts = (
        db.query(Contract).filter(Contract.quote_id.isnot(None)).order_by(Contract.created_at.desc()).limit(20).all()
    )
    deal_scores = []
    for c in sample_contracts:
        from app.models.deal import Quote
        q = db.get(Quote, c.quote_id)
        if q:
            try:
                deal_scores.append(intel.deal_score_for_quote(db, q)["deal_score"])
            except Exception:
                continue
    avg_deal_score = round(sum(deal_scores) / len(deal_scores), 1) if deal_scores else None

    status_dist = dict(
        db.query(Contract.status, func.count(Contract.id)).group_by(Contract.status).all()
    )
    recent_contracts = (
        db.query(Contract).order_by(Contract.created_at.desc()).limit(8).all()
    )
    recent_audit = (
        db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(15).all()
    )
    recent_risks = db.query(RiskEvent).order_by(RiskEvent.created_at.desc()).limit(5).all()

    return {
        "kpis": {
            "total_users": total_users, "buyers": buyers, "sellers": sellers,
            "active_contracts": active_contracts, "completed_contracts": completed_contracts,
            "open_requirements": open_requirements, "total_payments_value": float(total_payments_value),
            "pending_payments": pending_payments, "inspections_total": inspections_total,
            "open_disputes": open_disputes,
        },
        "contract_status_distribution": status_dist,
        "procurement_overview": {
            "total_procurement_value": float(total_procurement_value),
            "fulfillment_rate": fulfillment_rate,
            "avg_quality": avg_quality,
            "at_risk_value": float(at_risk_value),
            "avg_deal_score": avg_deal_score,
        },
        "recent_contracts": [
            {"id": str(c.id), "contract_no": c.contract_no, "product_name": c.product_name, "status": c.status, "total_value": float(c.total_value)}
            for c in recent_contracts
        ],
        "recent_audit_logs": [
            {"id": str(a.id), "action": a.action, "entity_type": a.entity_type, "created_at": a.created_at.isoformat()}
            for a in recent_audit
        ],
        "risk_alerts": [
            {"id": str(r.id), "event_type": r.event_type, "severity": r.severity, "description": r.description}
            for r in recent_risks
        ],
    }


@router.get("/attention")
def requires_attention(db: Session = Depends(get_db)):
    """Real operational alerts derived from actual rows — each is clickable
    in the frontend and links to the filtered view that explains it."""
    at_risk = db.query(Contract).filter(Contract.status == "AT_RISK").all()
    at_risk_value = sum(float(c.total_value) for c in at_risk)

    pending_inspections_count = (
        db.query(func.count(Inspection.id)).filter(Inspection.status == "PENDING").scalar()
    )
    overdue_payments = db.query(Payment).filter(Payment.status.in_(["DUE", "OVERDUE"])).all()
    overdue_value = sum(float(p.amount) for p in overdue_payments)

    ready_for_dispatch = db.query(func.count(Contract.id)).filter(Contract.status == "READY").scalar()
    disputed = db.query(func.count(Contract.id)).filter(Contract.status == "DISPUTED").scalar()

    items = []
    if at_risk:
        items.append({
            "severity": "critical", "title": f"{len(at_risk)} contract(s) at risk",
            "detail": f"₹{at_risk_value:,.0f} in exposure", "link": "/admin/contracts?status=AT_RISK",
        })
    if disputed:
        items.append({
            "severity": "critical", "title": f"{disputed} disputed contract(s)",
            "detail": "Requires management review", "link": "/admin/disputes",
        })
    if pending_inspections_count:
        items.append({
            "severity": "warning", "title": f"{pending_inspections_count} inspection(s) pending",
            "detail": "Awaiting a quality officer", "link": "/admin/quality",
        })
    if overdue_payments:
        items.append({
            "severity": "warning", "title": f"{len(overdue_payments)} payment(s) due or overdue",
            "detail": f"₹{overdue_value:,.0f} outstanding", "link": "/admin/payments",
        })
    if ready_for_dispatch:
        items.append({
            "severity": "good", "title": f"{ready_for_dispatch} contract(s) ready for dispatch",
            "detail": "On track for pickup", "link": "/admin/contracts?status=READY",
        })
    return items


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    rows = db.query(User).order_by(User.created_at.desc()).all()
    return [{"id": str(u.id), "email": u.email, "full_name": u.full_name, "role": u.role, "status": u.status, "created_at": u.created_at.isoformat()} for u in rows]


@router.get("/contracts")
def admin_contracts(db: Session = Depends(get_db)):
    from app.routers.contracts import serialize_contract
    rows = db.query(Contract).order_by(Contract.created_at.desc()).all()
    return [serialize_contract(c, db) for c in rows]


@router.get("/quality")
def admin_quality(db: Session = Depends(get_db)):
    rows = db.query(Inspection).order_by(Inspection.created_at.desc()).all()
    return [{"id": str(i.id), "contract_id": str(i.contract_id), "status": i.status, "notes": i.notes} for i in rows]


@router.get("/payments")
def admin_payments(db: Session = Depends(get_db)):
    rows = db.query(Payment).order_by(Payment.created_at.desc()).all()
    return [{"id": str(p.id), "contract_id": str(p.contract_id), "amount": float(p.amount), "status": p.status} for p in rows]


@router.get("/market")
def admin_market(db: Session = Depends(get_db)):
    rows = db.query(MarketPrice).order_by(MarketPrice.observed_at.desc()).limit(200).all()
    return [{"id": str(r.id), "product_name": r.product_name, "price": float(r.price), "location": r.location, "observed_at": r.observed_at.isoformat()} for r in rows]


@router.get("/disputes")
def admin_disputes(db: Session = Depends(get_db)):
    rows = db.query(Dispute).order_by(Dispute.created_at.desc()).all()
    return [{"id": str(d.id), "contract_id": str(d.contract_id), "status": d.status, "reason": d.reason} for d in rows]


@router.get("/reports")
def admin_reports(db: Session = Depends(get_db)):
    total_value = db.query(func.coalesce(func.sum(Contract.total_value), 0)).scalar()
    by_product = dict(db.query(Contract.product_name, func.count(Contract.id)).group_by(Contract.product_name).all())
    return {"total_contract_value": float(total_value), "contracts_by_product": by_product}


@router.get("/audit-logs")
def admin_audit_logs(db: Session = Depends(get_db), limit: int = 200):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(a.id), "actor_id": str(a.actor_id) if a.actor_id else None, "action": a.action,
            "entity_type": a.entity_type, "entity_id": str(a.entity_id) if a.entity_id else None,
            "created_at": a.created_at.isoformat(),
        } for a in rows
    ]
