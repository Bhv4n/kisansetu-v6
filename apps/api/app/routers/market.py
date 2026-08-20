from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.catalog import MarketPrice

router = APIRouter(prefix="/api/v1/market-prices", tags=["market"])


@router.get("")
def list_market_prices(
    db: Session = Depends(get_db),
    product_name: str | None = Query(default=None),
    location: str | None = Query(default=None),
    limit: int = 200,
):
    query = db.query(MarketPrice)
    if product_name:
        query = query.filter(MarketPrice.product_name.ilike(f"%{product_name}%"))
    if location:
        query = query.filter(MarketPrice.location.ilike(f"%{location}%"))
    rows = query.order_by(MarketPrice.observed_at.desc()).limit(limit).all()
    return [
        {
            "id": str(r.id), "product_name": r.product_name, "market": r.market,
            "location": r.location, "price": float(r.price), "unit": r.unit,
            "observed_at": r.observed_at.isoformat(), "source": r.source,
        } for r in rows
    ]


@router.get("/summary")
def market_summary(db: Session = Depends(get_db)):
    """Latest price + 7-day average per product, for chart/summary cards."""
    products = db.query(MarketPrice.product_name).distinct().all()
    out = []
    for (name,) in products:
        rows = (
            db.query(MarketPrice)
            .filter(MarketPrice.product_name == name)
            .order_by(MarketPrice.observed_at.desc())
            .limit(7)
            .all()
        )
        if not rows:
            continue
        latest = rows[0]
        avg7 = sum(float(r.price) for r in rows) / len(rows)
        prev = rows[1].price if len(rows) > 1 else latest.price
        trend = "up" if float(latest.price) > float(prev) else ("down" if float(latest.price) < float(prev) else "flat")
        out.append({
            "product_name": name, "current_price": float(latest.price), "unit": latest.unit,
            "avg_7day": round(avg7, 2), "trend": trend, "location": latest.location,
        })
    return out
