from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.core import User, BuyerProfile, SellerProfile
from app.schemas.auth import MeResponse

router = APIRouter(prefix="/api/v1", tags=["me"])


@router.get("/me", response_model=MeResponse)
def read_me(user: User = Depends(get_current_user)):
    return user


@router.get("/me/profile")
def read_my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == "BUYER":
        p = db.query(BuyerProfile).filter(BuyerProfile.user_id == user.id).first()
        return {
            "id": str(p.id), "business_name": p.business_name, "city": p.city,
            "state": p.state, "address": p.address, "pincode": p.pincode,
            "verification_status": p.verification_status,
        } if p else {}
    if user.role in ("SELLER", "FPO_MANAGER"):
        p = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
        return {
            "id": str(p.id), "display_name": p.display_name, "seller_type": p.seller_type,
            "city": p.city, "state": p.state, "address": p.address, "pincode": p.pincode,
            "verification_status": p.verification_status,
        } if p else {}
    return {}
