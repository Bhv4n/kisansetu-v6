"""
Backend tests for KISANSETU. Run with: pytest -v
Uses the same DATABASE_URL as the app; run against a disposable/test database
if you don't want to touch demo data (set DATABASE_URL env var before running).
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def unique_email(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8]}@test.kisansetu"


def register(role, **kw):
    payload = {"email": unique_email(role.lower()), "password": "Password123!", "full_name": f"Test {role}", "role": role, **kw}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_admin_self_register_rejected():
    r = client.post("/api/v1/auth/register", json={
        "email": unique_email("admin"), "password": "Password123!", "full_name": "X", "role": "ADMIN",
    })
    assert r.status_code == 400


def test_products_list_public():
    r = client.get("/api/v1/products")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_me_requires_auth():
    r = client.get("/api/v1/me")
    assert r.status_code == 401


def test_full_critical_path():
    """Mirrors PRD section 21: buyer -> seller -> negotiation -> contract -> quality -> payment -> completed."""
    buyer_email_addr = unique_email("buyer")
    seller_email_addr = unique_email("seller")

    b = client.post("/api/v1/auth/register", json={
        "email": buyer_email_addr, "password": "Password123!", "full_name": "Buyer One",
        "role": "BUYER", "business_name": "Buyer Co",
    })
    assert b.status_code == 200
    buyer_token = b.json()["access_token"]

    s = client.post("/api/v1/auth/register", json={
        "email": seller_email_addr, "password": "Password123!", "full_name": "Seller One",
        "role": "SELLER", "display_name": "Seller Farms",
    })
    assert s.status_code == 200
    seller_token = s.json()["access_token"]

    qo = client.post("/api/v1/auth/register", json={
        "email": unique_email("qo"), "password": "Password123!", "full_name": "QO One", "role": "FIELD_OFFICER",
    })
    qo_token = qo.json()["access_token"]

    # Seller lists a product
    prod = client.post("/api/v1/products", json={
        "name": "Test Tomato", "category": "Vegetable", "unit": "kg", "quantity": 5000, "grade": "A", "indicative_price": 22,
    }, headers=auth(seller_token))
    assert prod.status_code == 200
    product_id = prod.json()["id"]

    # Buyer posts requirement
    req = client.post("/api/v1/buyer-requirements", json={
        "product_id": product_id, "product_name": "Test Tomato", "quantity": 5000, "unit": "kg",
        "target_price": 24, "delivery_location": "Pune", "quality_requirement": {"grade": "A"},
    }, headers=auth(buyer_token))
    assert req.status_code == 200
    req_id = req.json()["id"]
    assert req.json()["status"] == "OPEN"

    # Seller submits quote
    quote = client.post("/api/v1/quotes", json={
        "requirement_id": req_id, "unit_price": 23.5, "quantity": 5000,
        "delivery_terms": "Pickup", "payment_terms": "3 days",
    }, headers=auth(seller_token))
    assert quote.status_code == 200
    quote_id = quote.json()["id"]
    assert len(quote.json()["versions"]) == 1

    # Buyer counters
    counter = client.post(f"/api/v1/quotes/{quote_id}/counter", json={"unit_price": 24}, headers=auth(buyer_token))
    assert counter.status_code == 200
    assert counter.json()["status"] == "COUNTERED"
    assert len(counter.json()["versions"]) == 2

    # Seller accepts -> contract created
    accept = client.post(f"/api/v1/quotes/{quote_id}/accept", headers=auth(seller_token))
    assert accept.status_code == 200
    contract_id = accept.json()["contract_id"]

    contract = client.get(f"/api/v1/contracts/{contract_id}", headers=auth(buyer_token))
    assert contract.status_code == 200
    assert contract.json()["status"] == "ACCEPTED"
    assert contract.json()["total_value"] == 24 * 5000

    # Progress milestones through to pickup
    for m in ("PRODUCTION_STARTED", "READY_FOR_PICKUP", "PICKUP"):
        resp = client.post(f"/api/v1/contracts/{contract_id}/milestones/{m}/complete", headers=auth(seller_token))
        assert resp.status_code == 200

    # Create lot
    lot = client.post("/api/v1/lots", json={"contract_id": contract_id, "quantity": 5000, "unit": "kg"}, headers=auth(seller_token))
    assert lot.status_code == 200
    lot_code = lot.json()["lot_code"]

    # Public lot passport lookup
    passport = client.get(f"/api/v1/lots/{lot_code}")
    assert passport.status_code == 200
    assert passport.json()["contract_no"]

    # Quality inspection
    lot_id = lot.json()["id"]
    insp = client.post("/api/v1/inspections", json={
        "lot_id": lot_id, "results": [{"parameter": "Grade", "measured_value": "A", "result": "PASS"}],
    }, headers=auth(qo_token))
    assert insp.status_code == 200
    assert insp.json()["status"] == "PASS"

    for m in ("QUALITY_INSPECTION", "DELIVERY"):
        resp = client.post(f"/api/v1/contracts/{contract_id}/milestones/{m}/complete", headers=auth(seller_token))
        assert resp.status_code == 200

    # Payment simulation
    pay = client.post("/api/v1/payments/simulate", json={"contract_id": contract_id, "amount": 120000}, headers=auth(buyer_token))
    assert pay.status_code == 200
    assert pay.json()["status"] == "PROCESSING"
    payment_id = pay.json()["id"]

    confirm = client.post(f"/api/v1/payments/{payment_id}/confirm", headers=auth(buyer_token))
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "PAID"

    final = client.post(f"/api/v1/contracts/{contract_id}/milestones/PAYMENT/complete", headers=auth(seller_token))
    assert final.status_code == 200
    assert final.json()["status"] == "COMPLETED"

    # Deep-linked notifications exist for both parties
    seller_notifs = client.get("/api/v1/notifications", headers=auth(seller_token))
    assert seller_notifs.status_code == 200
    assert len(seller_notifs.json()) > 0


def test_intelligence_endpoints_wired():
    """Smoke test: intelligence endpoints are reachable and return real,
    computed data (not stubs). Seeds its own market price history rather
    than relying on demo seed data, since tests run against a clean DB."""
    from datetime import datetime, timedelta, timezone
    from app.db.session import SessionLocal
    from app.models.catalog import MarketPrice

    product = f"TestCrop-{uuid.uuid4().hex[:6]}"
    db = SessionLocal()
    try:
        base_price = 30.0
        now = datetime.now(timezone.utc)
        for d in range(20):
            db.add(MarketPrice(
                product_name=product, market="Test Market", location="Test City",
                price=base_price + d * 0.3, unit="kg", observed_at=now - timedelta(days=19 - d),
                source="test",
            ))
        db.commit()
    finally:
        db.close()

    r = client.get(f"/api/v1/intelligence/price/{product}")
    assert r.status_code == 200
    data = r.json()
    assert data["current_price"] > 0
    assert data["trend"] in ("UP", "DOWN", "FLAT")
    assert "forecast" in data
    assert data["buyer_recommendation"]["action"] in ("NEGOTIATE", "WAIT", "BUY_NOW")

    r2 = client.get(f"/api/v1/intelligence/suppliers?product_name={product}&limit=3")
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)

    # Unknown product should 404, not silently return empty/fake data
    r3 = client.get("/api/v1/intelligence/price/NotARealCropXYZ")
    assert r3.status_code == 404


def test_role_authorization_enforced():
    b = client.post("/api/v1/auth/register", json={
        "email": unique_email("buyer2"), "password": "Password123!", "full_name": "Buyer Two",
        "role": "BUYER", "business_name": "Buyer Co 2",
    })
    buyer_token = b.json()["access_token"]
    # Buyers cannot create products (seller-only action)
    r = client.post("/api/v1/products", json={"name": "X", "category": "Y", "unit": "kg"}, headers=auth(buyer_token))
    assert r.status_code == 403


def test_cross_tenant_access_denied():
    """Object-level authorization: an authenticated user who is NOT a party to
    a contract/quote/requirement must be refused, even though they hold a
    valid token. Regression test for a real IDOR found during audit — a buyer
    was previously able to read AND complete milestones on another buyer's
    contract just by knowing its UUID."""
    # Party A: buyer + seller who transact together
    b1 = client.post("/api/v1/auth/register", json={
        "email": unique_email("partyA-buyer"), "password": "Password123!", "full_name": "Party A Buyer",
        "role": "BUYER", "business_name": "Party A Co",
    }).json()
    s1 = client.post("/api/v1/auth/register", json={
        "email": unique_email("partyA-seller"), "password": "Password123!", "full_name": "Party A Seller",
        "role": "SELLER", "display_name": "Party A Farms",
    }).json()
    prod = client.post("/api/v1/products", json={
        "name": "Isolation Test Crop", "category": "Vegetable", "unit": "kg", "quantity": 1000, "indicative_price": 10,
    }, headers=auth(s1["access_token"])).json()
    req = client.post("/api/v1/buyer-requirements", json={
        "product_id": prod["id"], "product_name": prod["name"], "quantity": 1000, "unit": "kg",
        "target_price": 10, "delivery_location": "Testville",
    }, headers=auth(b1["access_token"])).json()
    quote = client.post("/api/v1/quotes", json={
        "requirement_id": req["id"], "unit_price": 10, "quantity": 1000,
    }, headers=auth(s1["access_token"])).json()
    accept = client.post(f"/api/v1/quotes/{quote['id']}/accept", headers=auth(s1["access_token"]))
    contract_id = accept.json()["contract_id"]

    # Party B: a completely unrelated buyer
    b2 = client.post("/api/v1/auth/register", json={
        "email": unique_email("partyB-buyer"), "password": "Password123!", "full_name": "Party B Buyer",
        "role": "BUYER", "business_name": "Party B Co",
    }).json()
    intruder_headers = auth(b2["access_token"])

    # Reads must be denied
    assert client.get(f"/api/v1/contracts/{contract_id}", headers=intruder_headers).status_code == 403
    assert client.get(f"/api/v1/contracts/{contract_id}/payments", headers=intruder_headers).status_code == 403
    assert client.get(f"/api/v1/contracts/{contract_id}/quality", headers=intruder_headers).status_code == 403
    assert client.get(f"/api/v1/quotes/{quote['id']}", headers=intruder_headers).status_code == 403
    assert client.get(f"/api/v1/buyer-requirements/{req['id']}", headers=intruder_headers).status_code == 403

    # Writes must be denied
    assert client.post(f"/api/v1/contracts/{contract_id}/milestones/PRODUCTION_STARTED/complete", headers=intruder_headers).status_code == 403
    assert client.post("/api/v1/payments/simulate", json={"contract_id": contract_id, "amount": 100}, headers=intruder_headers).status_code == 403
    assert client.post("/api/v1/lots", json={"contract_id": contract_id, "quantity": 100, "unit": "kg"}, headers=intruder_headers).status_code == 403

    # The real owner must still have full access (fix shouldn't lock out legitimate parties)
    owner_headers = auth(b1["access_token"])
    assert client.get(f"/api/v1/contracts/{contract_id}", headers=owner_headers).status_code == 200
    assert client.post(f"/api/v1/contracts/{contract_id}/milestones/PRODUCTION_STARTED/complete", headers=owner_headers).status_code == 200
