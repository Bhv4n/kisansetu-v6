import uuid
from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # BUYER, SELLER, FPO_MANAGER, FIELD_OFFICER
    business_name: str | None = None  # for BUYER
    display_name: str | None = None  # for SELLER
    phone: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: uuid.UUID
    redirect: str


class MeResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    role: str

    class Config:
        from_attributes = True
