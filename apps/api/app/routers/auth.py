from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.core import User, BuyerProfile, SellerProfile
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, MeResponse
from app.services.audit import log_action

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

ROLE_REDIRECT = {
    "BUYER": "/buyer/dashboard",
    "SELLER": "/seller/dashboard",
    "FPO_MANAGER": "/seller/dashboard",
    "FIELD_OFFICER": "/admin/quality",
    "ADMIN": "/admin/dashboard",
}


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if payload.role not in ("BUYER", "SELLER", "FPO_MANAGER", "FIELD_OFFICER"):
        raise HTTPException(400, "Invalid role for self-registration")
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        full_name=payload.full_name,
        phone=payload.phone,
    )
    db.add(user)
    db.flush()

    if payload.role == "BUYER":
        db.add(BuyerProfile(user_id=user.id, business_name=payload.business_name or payload.full_name))
    elif payload.role in ("SELLER", "FPO_MANAGER"):
        db.add(SellerProfile(
            user_id=user.id,
            display_name=payload.display_name or payload.full_name,
            seller_type="FPO" if payload.role == "FPO_MANAGER" else "FARMER",
        ))

    log_action(db, user.id, "REGISTER", "user", user.id, after={"email": user.email, "role": user.role})
    db.commit()

    token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=token, role=user.role, user_id=user.id, redirect=ROLE_REDIRECT[user.role])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    log_action(db, user.id, "LOGIN", "user", user.id)
    db.commit()

    token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=token, role=user.role, user_id=user.id, redirect=ROLE_REDIRECT[user.role])


@router.post("/refresh", response_model=TokenResponse)
def refresh(user: User = Depends(get_current_user)):
    token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=token, role=user.role, user_id=user.id, redirect=ROLE_REDIRECT[user.role])



