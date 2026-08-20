import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.contract import Inspection, InspectionResult, Evidence, Lot, Contract
from app.models.core import User
from app.services.audit import log_action, notify
from app.core.authz import get_contract_scoped
from app.models.core import BuyerProfile, SellerProfile

router = APIRouter(prefix="/api/v1", tags=["quality"])


@router.post("/inspections")
def create_inspection(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("FIELD_OFFICER", "ADMIN")),
):
    lot = db.get(Lot, uuid.UUID(payload["lot_id"]))
    if not lot:
        raise HTTPException(404, "Lot not found")
    results = payload.get("results", [])  # [{parameter, measured_value, result}]
    overall = "PASS" if results and all(r.get("result") == "PASS" for r in results) else ("FAIL" if any(r.get("result") == "FAIL" for r in results) else "PENDING")

    inspection = Inspection(
        lot_id=lot.id,
        contract_id=lot.contract_id,
        assigned_to=user.id,
        status=overall,
        inspected_at=datetime.now(timezone.utc),
        notes=payload.get("notes"),
    )
    db.add(inspection)
    db.flush()
    for r in results:
        db.add(InspectionResult(
            inspection_id=inspection.id,
            parameter=r["parameter"],
            measured_value=str(r.get("measured_value", "")),
            result=r.get("result", "PASS"),
        ))

    contract = db.get(Contract, lot.contract_id)
    buyer = db.get(BuyerProfile, contract.buyer_id)
    seller = db.get(SellerProfile, contract.seller_id)
    log_action(db, user.id, "INSPECTION_CREATED", "inspection", inspection.id, after={"status": overall})
    if overall == "PASS":
        log_action(db, user.id, "QUALITY_APPROVED", "inspection", inspection.id)
    notify(db, buyer.user_id, "Quality inspection completed", f"Lot {lot.lot_code}: {overall}", f"/buyer/contracts/{contract.id}/quality")
    notify(db, seller.user_id, "Quality inspection completed", f"Lot {lot.lot_code}: {overall}", f"/seller/contracts/{contract.id}/quality")
    db.commit()
    return {"id": str(inspection.id), "status": inspection.status}


@router.get("/contracts/{contract_id}/quality")
def get_contract_quality(contract_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    get_contract_scoped(db, contract_id, user)  # 403s if caller isn't a party to this contract
    inspections = db.query(Inspection).filter(Inspection.contract_id == contract_id).all()
    out = []
    for i in inspections:
        results = db.query(InspectionResult).filter(InspectionResult.inspection_id == i.id).all()
        out.append({
            "id": str(i.id), "status": i.status, "notes": i.notes,
            "inspected_at": i.inspected_at.isoformat() if i.inspected_at else None,
            "results": [{"parameter": r.parameter, "measured_value": r.measured_value, "result": r.result} for r in results],
        })
    return out


@router.post("/evidence")
def upload_evidence(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    e = Evidence(
        inspection_id=payload.get("inspection_id"),
        file_url=payload["file_url"],
        file_type=payload.get("file_type"),
        uploaded_by=user.id,
    )
    db.add(e)
    db.commit()
    return {"id": str(e.id)}
