import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.ops import Dispute
from app.models.contract import Contract
from app.services.audit import log_action

router = APIRouter(prefix="/api/v1/disputes", tags=["disputes"])


def serialize(d: Dispute):
    return {
        "id": str(d.id), "contract_id": str(d.contract_id), "reason": d.reason,
        "status": d.status, "resolution": d.resolution, "created_at": d.created_at.isoformat(),
    }


@router.post("")
def create_dispute(payload: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    contract = db.get(Contract, uuid.UUID(payload["contract_id"]))
    if not contract:
        raise HTTPException(404, "Contract not found")
    d = Dispute(contract_id=contract.id, raised_by=user.id, reason=payload["reason"])
    db.add(d)
    contract.status = "DISPUTED"
    log_action(db, user.id, "DISPUTE_OPENED", "dispute", d.id, after={"reason": d.reason})
    db.commit()
    db.refresh(d)
    return serialize(d)


@router.get("/{dispute_id}")
def get_dispute(dispute_id: uuid.UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = db.get(Dispute, dispute_id)
    if not d:
        raise HTTPException(404, "Dispute not found")
    return serialize(d)


@router.post("/{dispute_id}/resolve")
def resolve_dispute(dispute_id: uuid.UUID, payload: dict, db: Session = Depends(get_db), user=Depends(require_roles("ADMIN"))):
    d = db.get(Dispute, dispute_id)
    if not d:
        raise HTTPException(404, "Dispute not found")
    d.status = "RESOLVED"
    d.resolution = payload.get("resolution")
    log_action(db, user.id, "DISPUTE_RESOLVED", "dispute", d.id, after={"resolution": d.resolution})
    db.commit()
    return serialize(d)
