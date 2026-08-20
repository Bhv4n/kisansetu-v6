"""
KISANSETU Procurement Intelligence.

Every function here is deterministic and computed from real rows already in
the database (market_prices, contracts, inspections, deliveries, buyer
requirements) — there is no external AI API call and nothing is fabricated.
Forecasts use ordinary least-squares linear regression over the product's
actual price history; scores are weighted averages of real historical
performance. This is intentionally simple enough to explain in a hackathon
demo, not a black box.
"""
from datetime import timedelta

from sqlalchemy.orm import Session

from app.models.catalog import MarketPrice
from app.models.core import SellerProfile
from app.models.deal import BuyerRequirement, Quote
from app.models.contract import Contract, Lot, Inspection, Delivery


# ---------------------------------------------------------------------------
# Price intelligence & forecasting
# ---------------------------------------------------------------------------

def price_intelligence(db: Session, product_name: str) -> dict | None:
    rows = (
        db.query(MarketPrice)
        .filter(MarketPrice.product_name == product_name)
        .order_by(MarketPrice.observed_at.desc())
        .limit(90)
        .all()
    )
    if not rows:
        return None
    current = float(rows[0].price)
    unit = rows[0].unit
    latest = rows[0].observed_at
    last7 = [float(r.price) for r in rows if r.observed_at >= latest - timedelta(days=7)]
    last30 = [float(r.price) for r in rows if r.observed_at >= latest - timedelta(days=30)]
    avg7 = round(sum(last7) / len(last7), 2) if last7 else current
    avg30 = round(sum(last30) / len(last30), 2) if last30 else current
    min30 = round(min(last30), 2) if last30 else current
    max30 = round(max(last30), 2) if last30 else current
    pct_change_30day = round(((current - avg30) / avg30) * 100, 1) if avg30 else 0.0

    if current > avg7 * 1.02:
        trend = "UP"
    elif current < avg7 * 0.98:
        trend = "DOWN"
    else:
        trend = "FLAT"

    return {
        "product_name": product_name, "unit": unit, "current_price": current,
        "avg_7day": avg7, "avg_30day": avg30, "min_30day": min30, "max_30day": max30,
        "trend": trend, "pct_change_30day": pct_change_30day,
    }


def price_forecast(db: Session, product_name: str) -> dict | None:
    """Ordinary least-squares linear regression over the product's real price
    history. Confidence is the fit's R^2 bucketed into LOW/MEDIUM/HIGH — a
    genuinely computed goodness-of-fit, not a made-up label."""
    rows = (
        db.query(MarketPrice)
        .filter(MarketPrice.product_name == product_name)
        .order_by(MarketPrice.observed_at.asc())
        .all()
    )
    if len(rows) < 5:
        return None

    base_day = rows[0].observed_at
    points = [((r.observed_at - base_day).total_seconds() / 86400, float(r.price)) for r in rows]
    n = len(points)
    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)
    sum_xy = sum(p[0] * p[1] for p in points)
    sum_xx = sum(p[0] * p[0] for p in points)
    denom = n * sum_xx - sum_x * sum_x

    if denom == 0:
        slope, intercept = 0.0, sum_y / n
    else:
        slope = (n * sum_xy - sum_x * sum_y) / denom
        intercept = (sum_y - slope * sum_x) / n

    mean_y = sum_y / n
    ss_tot = sum((p[1] - mean_y) ** 2 for p in points) or 1e-9
    ss_res = sum((p[1] - (intercept + slope * p[0])) ** 2 for p in points)
    r_squared = max(0.0, 1 - ss_res / ss_tot)
    confidence = "HIGH" if r_squared > 0.5 else ("MEDIUM" if r_squared > 0.15 else "LOW")

    last_x = points[-1][0]
    current_price = points[-1][1]
    forecast_3day = max(0.0, intercept + slope * (last_x + 3))
    forecast_7day = max(0.0, intercept + slope * (last_x + 7))
    pct_change_7day = round(((forecast_7day - current_price) / current_price) * 100, 1) if current_price else 0.0

    return {
        "product_name": product_name, "current_price": round(current_price, 2),
        "forecast_3day": round(forecast_3day, 2), "forecast_7day": round(forecast_7day, 2),
        "pct_change_7day": pct_change_7day, "confidence": confidence, "r_squared": round(r_squared, 2),
    }


def demand_level(db: Session, product_name: str) -> str:
    """Proxy for demand from real buyer activity: how many buyer requirements
    for this product were posted in the last 14 days. Not fabricated —
    derived from actual buyer_requirements rows."""
    cutoff_rows = (
        db.query(BuyerRequirement)
        .filter(BuyerRequirement.product_name == product_name)
        .order_by(BuyerRequirement.created_at.desc())
        .limit(200)
        .all()
    )
    if not cutoff_rows:
        return "LOW"
    latest = cutoff_rows[0].created_at
    recent = [r for r in cutoff_rows if r.created_at >= latest - timedelta(days=14)]
    count = len(recent)
    if count >= 6:
        return "VERY_HIGH"
    if count >= 3:
        return "HIGH"
    if count >= 1:
        return "MEDIUM"
    return "LOW"


def buyer_recommendation(forecast: dict) -> dict:
    pct = forecast["pct_change_7day"]
    current = forecast["current_price"]
    if pct >= 5:
        action = "NEGOTIATE"
        target_low, target_high = round(current * 0.92, 2), round(current * 0.97, 2)
        reason = f"Prices are forecast to rise {pct}% over the next 7 days — lock in a deal now, but push for a discount before the market moves further."
    elif pct <= -5:
        action = "WAIT"
        target_low, target_high = round(forecast["forecast_7day"] * 0.97, 2), round(forecast["forecast_7day"], 2)
        reason = f"Prices are forecast to fall {abs(pct)}% over the next 7 days — waiting is likely to get a better rate."
    else:
        action = "BUY_NOW"
        target_low, target_high = round(current * 0.97, 2), current
        reason = "Prices are stable — the current market rate is a fair entry point."
    return {"action": action, "target_price_low": target_low, "target_price_high": target_high, "reason": reason}


def farmer_recommendation(forecast: dict, demand: str) -> dict:
    pct = forecast["pct_change_7day"]
    if demand in ("HIGH", "VERY_HIGH") and pct >= -2:
        action = "SELL_NOW"
        reason = f"Demand is {demand.replace('_', ' ').lower()} right now and prices aren't dropping — a good window to sell."
    elif pct >= 5:
        action = "HOLD_3_DAYS"
        reason = f"Prices are trending up {pct}% — holding a few days could capture a better rate."
    elif pct <= -5:
        action = "SELL_NOW"
        reason = f"Prices are forecast to fall {abs(pct)}% — selling now avoids a worse rate later."
    else:
        action = "HOLD_3_DAYS"
        reason = "Demand and prices are steady — a short hold is low-risk and may improve the rate slightly."
    return {"action": action, "reason": reason}


# ---------------------------------------------------------------------------
# Supplier score
# ---------------------------------------------------------------------------

def supplier_score(db: Session, seller_id) -> dict:
    contracts = db.query(Contract).filter(Contract.seller_id == seller_id).all()
    total = len(contracts)
    completed = len([c for c in contracts if c.status == "COMPLETED"])
    fulfillment_rate = (completed / total * 100) if total else 70.0  # neutral baseline for a new, unproven seller

    lot_ids = [
        lot_id for (lot_id,) in
        db.query(Lot.id).join(Contract, Lot.contract_id == Contract.id).filter(Contract.seller_id == seller_id).all()
    ]
    inspections = db.query(Inspection).filter(Inspection.lot_id.in_(lot_ids)).all() if lot_ids else []
    quality_score = (len([i for i in inspections if i.status == "PASS"]) / len(inspections) * 100) if inspections else 75.0

    deliveries = (
        db.query(Delivery).join(Contract, Delivery.contract_id == Contract.id)
        .filter(Contract.seller_id == seller_id, Delivery.actual_delivery_date.isnot(None)).all()
    )
    on_time = [d for d in deliveries if d.expected_delivery_date and d.actual_delivery_date <= d.expected_delivery_date]
    delivery_score = (len(on_time) / len(deliveries) * 100) if deliveries else 75.0

    price_scores = []
    for c in contracts:
        pi = price_intelligence(db, c.product_name)
        if pi and pi["avg_30day"]:
            ratio = float(c.unit_price) / pi["avg_30day"]
            price_scores.append(max(0.0, min(100.0, 100 - (ratio - 1) * 150)))
    pricing_score = sum(price_scores) / len(price_scores) if price_scores else 70.0

    overall = round(0.3 * fulfillment_rate + 0.3 * quality_score + 0.2 * delivery_score + 0.2 * pricing_score, 1)
    return {
        "seller_id": str(seller_id), "overall_score": overall,
        "fulfillment_rate": round(fulfillment_rate, 1), "quality_score": round(quality_score, 1),
        "delivery_score": round(delivery_score, 1), "pricing_score": round(pricing_score, 1),
        "total_contracts": total, "completed_contracts": completed,
    }


def top_suppliers_for_product(db: Session, product_name: str, limit: int = 5) -> list[dict]:
    seller_ids = [
        sid for (sid,) in
        db.query(SellerProfile.id).join(Contract, Contract.seller_id == SellerProfile.id)
        .filter(Contract.product_name == product_name).distinct().all()
    ]
    # Also include sellers who currently list the product but haven't contracted it yet
    from app.models.catalog import Product
    listing_seller_ids = [
        sid for (sid,) in db.query(Product.seller_id).filter(Product.name == product_name, Product.active == True).distinct().all()  # noqa: E712
    ]
    all_ids = list({*seller_ids, *listing_seller_ids})
    pi = price_intelligence(db, product_name)

    results = []
    for sid in all_ids:
        seller = db.get(SellerProfile, sid)
        if not seller:
            continue
        score = supplier_score(db, sid)
        suggested_price = None
        if pi:
            # Suggest slightly under the seller's own historical average (or market avg for unproven sellers)
            base = pi["avg_30day"]
            discount = 0.02 if score["overall_score"] >= 85 else 0.0
            suggested_price = round(base * (1 - discount), 2)
        results.append({
            **score, "seller_name": seller.display_name, "city": seller.city, "state": seller.state,
            "suggested_price": suggested_price,
        })
    results.sort(key=lambda r: r["overall_score"], reverse=True)
    return results[:limit]


# ---------------------------------------------------------------------------
# Deal score (for a specific quote)
# ---------------------------------------------------------------------------

def deal_score_for_quote(db: Session, quote: Quote) -> dict:
    seller = db.get(SellerProfile, quote.seller_id)
    req = db.get(BuyerRequirement, quote.requirement_id)
    pi = price_intelligence(db, req.product_name) if req else None
    supplier = supplier_score(db, seller.id)

    if pi and pi["avg_30day"]:
        ratio = float(quote.unit_price) / pi["avg_30day"]
        price_competitiveness = max(0.0, min(100.0, 100 - (ratio - 1) * 150))
    else:
        price_competitiveness = 70.0

    if pi and pi["trend"] == "UP":
        market_conditions = 85.0  # locking in now during a rising market is favorable
    elif pi and pi["trend"] == "DOWN":
        market_conditions = 60.0  # buyer might get a better price by waiting
    else:
        market_conditions = 75.0

    overall = round(
        0.35 * price_competitiveness + 0.25 * supplier["quality_score"]
        + 0.20 * supplier["delivery_score"] + 0.20 * market_conditions, 1
    )

    notes = []
    if price_competitiveness >= 80:
        notes.append("priced well below the 30-day market average")
    elif price_competitiveness <= 40:
        notes.append("priced above the 30-day market average")
    else:
        notes.append("priced close to the 30-day market average")
    if supplier["quality_score"] >= 85:
        notes.append("a strong quality inspection track record")
    if supplier["total_contracts"] > 0 and supplier["delivery_score"] < 60:
        notes.append("a history of delivery delays worth asking about")
    elif supplier["delivery_score"] >= 85:
        notes.append("reliable on-time delivery")

    return {
        "deal_score": overall,
        "breakdown": {
            "price_competitiveness": round(price_competitiveness, 1),
            "quality_reliability": supplier["quality_score"],
            "delivery_reliability": supplier["delivery_score"],
            "market_conditions": round(market_conditions, 1),
        },
        "explanation": "This deal is " + ", ".join(notes) + ".",
    }


# ---------------------------------------------------------------------------
# Contract risk score
# ---------------------------------------------------------------------------

def contract_risk_score(db: Session, contract: Contract) -> dict:
    seller_contracts = db.query(Contract).filter(
        Contract.seller_id == contract.seller_id, Contract.id != contract.id
    ).all()
    total = len(seller_contracts)
    risky = len([c for c in seller_contracts if c.status in ("AT_RISK", "DISPUTED", "CANCELLED")])
    delay_ratio = (risky / total) if total else 0.1

    pi = price_intelligence(db, contract.product_name)
    volatility = abs(pi["pct_change_30day"]) if pi else 0.0

    qty_factor = min(1.0, float(contract.quantity) / 8000)

    risk_value = delay_ratio * 45 + min(volatility / 20, 1) * 30 + qty_factor * 25
    if risk_value >= 55:
        level = "HIGH"
    elif risk_value >= 30:
        level = "MEDIUM"
    else:
        level = "LOW"

    reasons = []
    if total > 0 and risky > 0:
        reasons.append(f"the seller has {risky} of {total} past contracts flagged at-risk, disputed, or cancelled")
    if pi and abs(pi["pct_change_30day"]) >= 10:
        reasons.append(f"{contract.product_name} prices have moved {pi['pct_change_30day']}% over the last 30 days")
    if qty_factor > 0.6:
        reasons.append("this is a large-quantity order relative to typical contract sizes")

    reason = ("This contract shows elevated risk because " + "; ".join(reasons) + "."
              if reasons else "No significant risk factors were found in the historical data for this seller or product.")

    return {"risk_level": level, "risk_score": round(risk_value, 1), "reason": reason}


# ---------------------------------------------------------------------------
# Negotiation assistant
# ---------------------------------------------------------------------------

def negotiation_suggestion(db: Session, quote: Quote) -> dict | None:
    req = db.get(BuyerRequirement, quote.requirement_id)
    if not req:
        return None
    pi = price_intelligence(db, req.product_name)
    if not pi:
        return None
    current_quote = float(quote.unit_price)
    market_avg = pi["avg_30day"]
    if market_avg == 0:
        return None
    pct_above = round(((current_quote - market_avg) / market_avg) * 100, 1)
    suggested_counter = round(market_avg * 1.02, 2)  # a small, realistic margin above pure market average

    if pct_above > 3:
        reason = f"Current quote is {pct_above}% above the 30-day market average of ₹{market_avg}/{pi['unit']}."
        should_counter = True
    elif pct_above < -3:
        reason = f"Current quote is already {abs(pct_above)}% below the 30-day market average — a strong offer."
        should_counter = False
        suggested_counter = current_quote
    else:
        reason = f"Current quote is within {abs(pct_above)}% of the 30-day market average — a fair price."
        should_counter = False
        suggested_counter = current_quote

    return {
        "current_quote": current_quote, "market_average": market_avg, "pct_above_market": pct_above,
        "suggested_counter": suggested_counter, "should_counter": should_counter, "reason": reason,
    }
