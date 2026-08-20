import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.catalog import Product, ProductAvailability
from app.models.core import SellerProfile, User
from app.services.audit import log_action

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def serialize_product(p: Product, db: Session):
    seller = db.get(SellerProfile, p.seller_id)
    avail = (
        db.query(ProductAvailability)
        .filter(ProductAvailability.product_id == p.id)
        .order_by(ProductAvailability.created_at.desc())
        .first()
    )
    return {
        "id": str(p.id),
        "name": p.name,
        "category": p.category,
        "variety": p.variety,
        "unit": p.unit,
        "description": p.description,
        "image_url": p.image_url,
        "indicative_price": float(p.indicative_price) if p.indicative_price else None,
        "location": p.location,
        "seller_id": str(p.seller_id),
        "seller_name": seller.display_name if seller else None,
        "available_quantity": float(avail.quantity) if avail else None,
        "grade": avail.grade if avail else None,
        "active": p.active,
    }


@router.get("")
def list_products(
    db: Session = Depends(get_db),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
    location: str | None = Query(default=None),
):
    query = db.query(Product).filter(Product.active == True)  # noqa: E712
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    if q:
        query = query.filter(Product.name.ilike(f"%{q}%"))
    if location:
        query = query.filter(Product.location.ilike(f"%{location}%"))
    products = query.order_by(Product.created_at.desc()).all()
    return [serialize_product(p, db) for p in products]


@router.get("/{product_id}")
def get_product(product_id: uuid.UUID, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    return serialize_product(p, db)


@router.post("")
def create_product(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("SELLER", "FPO_MANAGER")),
):
    seller = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
    if not seller:
        raise HTTPException(400, "Seller profile not found")
    p = Product(
        seller_id=seller.id,
        name=payload["name"],
        category=payload["category"],
        variety=payload.get("variety"),
        unit=payload.get("unit", "kg"),
        description=payload.get("description"),
        indicative_price=payload.get("indicative_price"),
        location=payload.get("location"),
        image_url=payload.get("image_url"),
    )
    db.add(p)
    db.flush()
    if payload.get("quantity"):
        db.add(ProductAvailability(
            product_id=p.id,
            quantity=payload["quantity"],
            unit=payload.get("unit", "kg"),
            grade=payload.get("grade"),
        ))
    log_action(db, user.id, "PRODUCT_CREATED", "product", p.id, after={"name": p.name})
    db.commit()
    return serialize_product(p, db)
