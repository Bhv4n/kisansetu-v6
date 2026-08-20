"""
Object-level authorization helpers.

Role checks (require_roles) only establish WHAT KIND of user is calling an
endpoint. They do not establish that the user is a PARTY to the specific
record being accessed. Every endpoint that reads or mutates a contract,
quote, requirement, or payment must additionally confirm the caller is the
buyer, the seller, or an admin/field-officer for that specific record —
otherwise any authenticated user can read or modify any other user's deals.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core import User, BuyerProfile, SellerProfile
from app.models.contract import Contract
from app.models.deal import BuyerRequirement, Quote

STAFF_ROLES = ("ADMIN", "FIELD_OFFICER")


def _profile_user_ids(db: Session, contract: Contract) -> tuple:
    buyer = db.get(BuyerProfile, contract.buyer_id)
    seller = db.get(SellerProfile, contract.seller_id)
    return (buyer.user_id if buyer else None, seller.user_id if seller else None)


def assert_contract_party(db: Session, contract: Contract, user: User) -> None:
    """Raise 403 unless user is the contract's buyer, its seller, or staff."""
    if user.role in STAFF_ROLES:
        return
    buyer_user_id, seller_user_id = _profile_user_ids(db, contract)
    if user.id not in (buyer_user_id, seller_user_id):
        raise HTTPException(403, "You do not have access to this contract")


def get_contract_scoped(db: Session, contract_id, user: User) -> Contract:
    contract = db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "Contract not found")
    assert_contract_party(db, contract, user)
    return contract


def assert_requirement_party(db: Session, requirement: BuyerRequirement, user: User) -> None:
    """Requirement owner (buyer) or staff can view full detail. Sellers can
    view requirements that are open for quoting (the opportunity board) —
    but not another buyer's requirement."""
    if user.role in STAFF_ROLES or user.role in ("SELLER", "FPO_MANAGER"):
        return
    buyer = db.get(BuyerProfile, requirement.buyer_id)
    if not buyer or user.id != buyer.user_id:
        raise HTTPException(403, "You do not have access to this requirement")


def assert_quote_party(db: Session, quote: Quote, user: User) -> None:
    """Only the buyer who owns the requirement, the seller who submitted the
    quote, or staff may view/act on a quote — it contains private negotiated
    pricing between two specific parties."""
    if user.role in STAFF_ROLES:
        return
    requirement = db.get(BuyerRequirement, quote.requirement_id)
    seller = db.get(SellerProfile, quote.seller_id)
    buyer = db.get(BuyerProfile, requirement.buyer_id) if requirement else None
    allowed_user_ids = set()
    if buyer:
        allowed_user_ids.add(buyer.user_id)
    if seller:
        allowed_user_ids.add(seller.user_id)
    if user.id not in allowed_user_ids:
        raise HTTPException(403, "You do not have access to this quote")
