import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.core.authz import get_contract_scoped, assert_quote_party
from app.models.core import User, SellerProfile
from app.models.deal import Quote
from app.services import intelligence as intel

router = APIRouter(prefix="/api/v1/intelligence", tags=["intelligence"])


@router.get("/price/{product_name}")
def get_price_intelligence(product_name: str, db: Session = Depends(get_db)):
    """Public — mirrors /market-prices, which is also unauthenticated."""
    pi = intel.price_intelligence(db, product_name)
    if not pi:
        raise HTTPException(404, "No market price history for this product")
    forecast = intel.price_forecast(db, product_name)
    demand = intel.demand_level(db, product_name)
    result = {**pi, "demand": demand}
    if forecast:
        # Keep the headline "trend" consistent with the forecast direction (same
        # regression slope) rather than the shorter current-vs-7day heuristic —
        # avoids the confusing case of "trend: UP" next to a falling forecast.
        if forecast["pct_change_7day"] > 1:
            result["trend"] = "UP"
        elif forecast["pct_change_7day"] < -1:
            result["trend"] = "DOWN"
        else:
            result["trend"] = "FLAT"
        result["forecast"] = forecast
        result["buyer_recommendation"] = intel.buyer_recommendation(forecast)
        result["farmer_recommendation"] = intel.farmer_recommendation(forecast, demand)
    return result


@router.get("/suppliers")
def get_top_suppliers(product_name: str, db: Session = Depends(get_db), limit: int = 5):
    """Public — 'Top suppliers for Tomato' is browsable before login, same as product listings."""
    return intel.top_suppliers_for_product(db, product_name, limit=limit)


@router.get("/suppliers/{seller_id}/score")
def get_supplier_score(seller_id: uuid.UUID, db: Session = Depends(get_db)):
    seller = db.get(SellerProfile, seller_id)
    if not seller:
        raise HTTPException(404, "Seller not found")
    score = intel.supplier_score(db, seller_id)
    return {**score, "seller_name": seller.display_name, "city": seller.city, "state": seller.state}


@router.get("/quotes/{quote_id}/deal-score")
def get_deal_score(quote_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(404, "Quote not found")
    assert_quote_party(db, quote, user)
    return intel.deal_score_for_quote(db, quote)


@router.get("/quotes/{quote_id}/suggestion")
def get_negotiation_suggestion(quote_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(404, "Quote not found")
    assert_quote_party(db, quote, user)
    suggestion = intel.negotiation_suggestion(db, quote)
    if not suggestion:
        raise HTTPException(404, "Not enough market data to generate a suggestion for this product")
    return suggestion


@router.get("/contracts/{contract_id}/risk")
def get_contract_risk(contract_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    contract = get_contract_scoped(db, contract_id, user)
    return intel.contract_risk_score(db, contract)


@router.get("/farmer/recommendations")
def get_farmer_recommendations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("SELLER", "FPO_MANAGER"):
        raise HTTPException(403, "Only sellers have a farmer recommendation feed")
    seller = db.query(SellerProfile).filter(SellerProfile.user_id == user.id).first()
    if not seller:
        raise HTTPException(400, "Seller profile not found")

    from app.models.catalog import Product
    products = db.query(Product).filter(Product.seller_id == seller.id, Product.active == True).all()  # noqa: E712

    out = []
    seen = set()
    for p in products:
        if p.name in seen:
            continue
        seen.add(p.name)
        pi = intel.price_intelligence(db, p.name)
        if not pi:
            continue
        forecast = intel.price_forecast(db, p.name)
        demand = intel.demand_level(db, p.name)
        rec = intel.farmer_recommendation(forecast, demand) if forecast else {"action": "HOLD_3_DAYS", "reason": "Not enough price history yet for a confident recommendation."}
        out.append({
            "product_name": p.name, "current_price": pi["current_price"], "unit": pi["unit"],
            "forecast_7day": forecast["forecast_7day"] if forecast else None,
            "trend": pi["trend"], "demand": demand,
            "recommended_action": rec["action"], "reason": rec["reason"],
        })
    return out
