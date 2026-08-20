"""
KISANSETU demo data seeder.

Run with:  python -m app.seed
Populates a realistic, relationally-coherent dataset so the app never
opens empty. All data here is clearly demo/seed data (see README) —
none of it represents real transactions.
"""
import random
import secrets
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone, date

from app.db.session import SessionLocal, engine, Base
from app.core.security import hash_password
import app.models  # noqa - registers all models
from app.models.core import User, BuyerProfile, SellerProfile, Fpo, Farm
from app.models.catalog import Product, ProductAvailability, MarketPrice
from app.models.deal import BuyerRequirement, Quote, QuoteVersion
from app.models.contract import (
    Contract, ContractVersion, ContractMilestone, Lot, Inspection, InspectionResult, Delivery, MILESTONE_SEQUENCE,
)
from app.models.ops import ChatThread, ChatMessage, Payment, Dispute, RiskEvent, Notification, AuditLog

random.seed(42)
DEMO_PASSWORD = "Password123!"
NOW = datetime.now(timezone.utc)


def days_ago(n, hour=10, minute=0):
    return (NOW - timedelta(days=n)).replace(hour=hour, minute=minute, second=0, microsecond=0)


def spread_days_ago(i, total, max_days=90, min_days=2, hour=10):
    """Evenly spread `total` items across [min_days, max_days] in the past,
    regardless of how large `total` is — avoids the classic seed-script bug
    where `max_days - i * step` goes negative (i.e. into the future) once a
    list grows past what the original offsets were sized for."""
    if total <= 1:
        return days_ago(max_days, hour=hour)
    offset = max_days - int(i * (max_days - min_days) / (total - 1))
    return days_ago(offset, hour=hour)


def log(db, actor_id, action, entity_type, entity_id=None, before=None, after=None, when=None):
    entry = AuditLog(
        actor_id=actor_id, action=action, entity_type=entity_type, entity_id=entity_id,
        before_json=before, after_json=after, created_at=when or NOW,
    )
    db.add(entry)
    return entry


def notify(db, user_id, title, body=None, link=None, when=None, is_read=False):
    n = Notification(user_id=user_id, title=title, body=body, link=link, created_at=when or NOW, is_read=is_read)
    db.add(n)
    return n


def make_user(db, email, role, full_name, when, phone=None):
    u = User(
        email=email, password_hash=hash_password(DEMO_PASSWORD), role=role,
        full_name=full_name, phone=phone, status="ACTIVE", created_at=when,
    )
    db.add(u)
    db.flush()
    log(db, u.id, "REGISTER", "user", u.id, after={"email": email, "role": role}, when=when)
    return u


def reset_schema():
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Reference demo data
# ---------------------------------------------------------------------------

BUYERS = [
    {"email": "buyer@kisansetu.demo", "name": "Ananya Rao", "business": "FreshFoods Pvt Ltd", "city": "Bengaluru", "state": "Karnataka"},
    {"email": "buyer2@kisansetu.demo", "name": "Vikram Shah", "business": "GreenHarvest Foods", "city": "Hyderabad", "state": "Telangana"},
    {"email": "buyer3@kisansetu.demo", "name": "Kavita Menon", "business": "Bharat Agro Processing", "city": "Mumbai", "state": "Maharashtra"},
    {"email": "buyer4@kisansetu.demo", "name": "Rohan Kapoor", "business": "Metro Fresh Distributors", "city": "Delhi", "state": "Delhi"},
    {"email": "buyer5@kisansetu.demo", "name": "Sneha Iyer", "business": "Southern Spice Traders", "city": "Chennai", "state": "Tamil Nadu"},
    {"email": "buyer6@kisansetu.demo", "name": "Arjun Reddy", "business": "Deccan Grain Mills", "city": "Hyderabad", "state": "Telangana"},
    {"email": "buyer7@kisansetu.demo", "name": "Meera Joshi", "business": "Western Foods Co", "city": "Pune", "state": "Maharashtra"},
    {"email": "buyer8@kisansetu.demo", "name": "Farhan Sheikh", "business": "National Retail Supply Chain", "city": "Ahmedabad", "state": "Gujarat"},
]

SELLERS = [
    {"email": "seller@kisansetu.demo", "name": "Rajesh Patil", "business": "Rajesh Farms", "city": "Nashik", "state": "Maharashtra"},
    {"email": "seller2@kisansetu.demo", "name": "Suresh Deshmukh", "business": "Green Valley Farms", "city": "Pune", "state": "Maharashtra"},
    {"email": "seller3@kisansetu.demo", "name": "Anil Verma", "business": "Shakti Agro Producers", "city": "Indore", "state": "Madhya Pradesh"},
    {"email": "seller4@kisansetu.demo", "name": "Lakshmi Gowda", "business": "Sunrise Organics", "city": "Bengaluru", "state": "Karnataka"},
    {"email": "seller5@kisansetu.demo", "name": "Harpreet Singh", "business": "Punjab Fresh Produce", "city": "Ludhiana", "state": "Punjab"},
    {"email": "seller6@kisansetu.demo", "name": "Manohar Reddy", "business": "Telangana Millet Farms", "city": "Warangal", "state": "Telangana"},
    {"email": "seller7@kisansetu.demo", "name": "Kiran Patel", "business": "Gujarat Cotton Growers", "city": "Ahmedabad", "state": "Gujarat"},
    {"email": "seller8@kisansetu.demo", "name": "Devendra Chauhan", "business": "Malwa Wheat Co-op", "city": "Ujjain", "state": "Madhya Pradesh"},
    {"email": "seller9@kisansetu.demo", "name": "Ramesh Naik", "business": "Konkan Fruit Orchards", "city": "Ratnagiri", "state": "Maharashtra"},
    {"email": "seller10@kisansetu.demo", "name": "Sunita Yadav", "business": "Yamuna Valley Vegetables", "city": "Agra", "state": "Uttar Pradesh"},
    {"email": "seller11@kisansetu.demo", "name": "Balbir Kaur", "business": "Doaba Grain Traders", "city": "Jalandhar", "state": "Punjab"},
    {"email": "seller12@kisansetu.demo", "name": "Muthu Krishnan", "business": "Tamil Nadu Spice Growers", "city": "Coimbatore", "state": "Tamil Nadu"},
    {"email": "seller13@kisansetu.demo", "name": "Geeta Pawar", "business": "Vidarbha Cotton Farms", "city": "Nagpur", "state": "Maharashtra"},
    {"email": "seller14@kisansetu.demo", "name": "Ashok Bhandari", "business": "Rajasthan Pulses Ltd", "city": "Jaipur", "state": "Rajasthan"},
]

FPO = {"email": "fpo@kisansetu.demo", "name": "Ganesh Wagh", "business": "Nashik Growers FPO", "city": "Nashik", "state": "Maharashtra"}
FPO2 = {"email": "fpo2@kisansetu.demo", "name": "Ravindra Solanki", "business": "Malwa Farmers Collective", "city": "Indore", "state": "Madhya Pradesh"}
FPOS = [
    FPO, FPO2,
    {"email": "fpo3@kisansetu.demo", "name": "Chandrakant Bhosale", "business": "Vidarbha Farmers Producer Co", "city": "Nagpur", "state": "Maharashtra"},
    {"email": "fpo4@kisansetu.demo", "name": "Iqbal Dhillon", "business": "Doaba Growers FPO", "city": "Jalandhar", "state": "Punjab"},
    {"email": "fpo5@kisansetu.demo", "name": "Venkatesh Rao", "business": "Godavari Delta Farmers Collective", "city": "Vijayawada", "state": "Andhra Pradesh"},
    {"email": "fpo6@kisansetu.demo", "name": "Nirmala Devi", "business": "Malabar Spice Producers FPO", "city": "Kochi", "state": "Kerala"},
    {"email": "fpo7@kisansetu.demo", "name": "Baldev Sandhu", "business": "Malwa Cotton Producers Co", "city": "Bhopal", "state": "Madhya Pradesh"},
    {"email": "fpo8@kisansetu.demo", "name": "Ananthu Pillai", "business": "Coastal Karnataka Farmers Collective", "city": "Belagavi", "state": "Karnataka"},
    {"email": "fpo9@kisansetu.demo", "name": "Rukmini Bai", "business": "Marathwada Growers FPO", "city": "Aurangabad", "state": "Maharashtra"},
    {"email": "fpo10@kisansetu.demo", "name": "Tarsem Lal", "business": "Haryana Grain Producers Co", "city": "Chandigarh", "state": "Chandigarh"},
]

QUALITY_OFFICERS = [
    {"email": "quality@kisansetu.demo", "name": "Priya Nair"},
    {"email": "quality2@kisansetu.demo", "name": "Manoj Kumar"},
    {"email": "quality3@kisansetu.demo", "name": "Divya Subramaniam"},
    {"email": "quality4@kisansetu.demo", "name": "Rakesh Tiwari"},
]

ADMINS = [
    {"email": "admin@kisansetu.demo", "name": "Sanjay Mehta"},
    {"email": "admin2@kisansetu.demo", "name": "Kavya Krishnan"},
    {"email": "admin3@kisansetu.demo", "name": "Rohit Malhotra"},
    {"email": "admin4@kisansetu.demo", "name": "Fatima Sheikh"},
    {"email": "admin5@kisansetu.demo", "name": "Suresh Pillai"},
    {"email": "admin6@kisansetu.demo", "name": "Anjali Deshpande"},
]
ADMIN = ADMINS[0]  # kept for backwards-compatible reference (primary demo admin account)

PRODUCT_CATALOG = [
    {"name": "Tomato", "category": "Vegetable", "unit": "kg", "variety": "Hybrid", "price": 22, "location": "Nashik"},
    {"name": "Onion", "category": "Vegetable", "unit": "kg", "variety": "Red", "price": 18, "location": "Pune"},
    {"name": "Potato", "category": "Vegetable", "unit": "kg", "variety": "Kufri Jyoti", "price": 14, "location": "Indore"},
    {"name": "Cabbage", "category": "Vegetable", "unit": "kg", "variety": "Green", "price": 10, "location": "Bengaluru"},
    {"name": "Cauliflower", "category": "Vegetable", "unit": "kg", "variety": "Snowball", "price": 16, "location": "Agra"},
    {"name": "Brinjal", "category": "Vegetable", "unit": "kg", "variety": "Long Purple", "price": 20, "location": "Nashik"},
    {"name": "Spinach", "category": "Vegetable", "unit": "kg", "variety": "Local", "price": 15, "location": "Pune"},
    {"name": "Beetroot", "category": "Vegetable", "unit": "kg", "variety": "Detroit Dark Red", "price": 19, "location": "Agra"},
    {"name": "Carrot", "category": "Vegetable", "unit": "kg", "variety": "Nantes", "price": 24, "location": "Ooty"},
    {"name": "Okra", "category": "Vegetable", "unit": "kg", "variety": "Bhindi", "price": 26, "location": "Nashik"},
    {"name": "Bottle Gourd", "category": "Vegetable", "unit": "kg", "variety": "Lauki", "price": 13, "location": "Agra"},
    {"name": "Bitter Gourd", "category": "Vegetable", "unit": "kg", "variety": "Karela", "price": 30, "location": "Pune"},
    {"name": "Capsicum", "category": "Vegetable", "unit": "kg", "variety": "Green Bell", "price": 34, "location": "Bengaluru"},
    {"name": "Basmati Rice", "category": "Grain", "unit": "quintal", "variety": "1121", "price": 4200, "location": "Ludhiana"},
    {"name": "Basmati Rice", "category": "Grain", "unit": "quintal", "variety": "Pusa 1509", "price": 3900, "location": "Amritsar"},
    {"name": "Wheat", "category": "Grain", "unit": "quintal", "variety": "Sharbati", "price": 2350, "location": "Indore"},
    {"name": "Wheat", "category": "Grain", "unit": "quintal", "variety": "Lokwan", "price": 2200, "location": "Ujjain"},
    {"name": "Maize", "category": "Grain", "unit": "quintal", "variety": "Hybrid Yellow", "price": 1950, "location": "Warangal"},
    {"name": "Jowar", "category": "Grain", "unit": "quintal", "variety": "White", "price": 2800, "location": "Warangal"},
    {"name": "Bajra", "category": "Grain", "unit": "quintal", "variety": "Hybrid", "price": 2200, "location": "Jaipur"},
    {"name": "Ragi", "category": "Grain", "unit": "quintal", "variety": "Finger Millet", "price": 3400, "location": "Mysuru"},
    {"name": "Soybean", "category": "Grain", "unit": "quintal", "variety": "JS-335", "price": 4650, "location": "Indore"},
    {"name": "Barley", "category": "Grain", "unit": "quintal", "variety": "Six Row", "price": 1850, "location": "Chandigarh"},
    {"name": "Toor Dal (Arhar)", "category": "Pulses", "unit": "quintal", "variety": "Standard", "price": 9800, "location": "Nashik"},
    {"name": "Moong Dal", "category": "Pulses", "unit": "quintal", "variety": "Whole Green", "price": 8600, "location": "Jaipur"},
    {"name": "Chana Dal", "category": "Pulses", "unit": "quintal", "variety": "Bengal Gram", "price": 6900, "location": "Jaipur"},
    {"name": "Urad Dal", "category": "Pulses", "unit": "quintal", "variety": "Black Gram", "price": 9200, "location": "Nagpur"},
    {"name": "Masoor Dal", "category": "Pulses", "unit": "quintal", "variety": "Red Lentil", "price": 7400, "location": "Kanpur"},
    {"name": "Cotton", "category": "Cash Crop", "unit": "quintal", "variety": "Shankar-6", "price": 7100, "location": "Nashik"},
    {"name": "Cotton", "category": "Cash Crop", "unit": "quintal", "variety": "Bt Cotton", "price": 6950, "location": "Nagpur"},
    {"name": "Sugarcane", "category": "Cash Crop", "unit": "tonne", "variety": "Co-86032", "price": 3200, "location": "Pune"},
    {"name": "Groundnut", "category": "Cash Crop", "unit": "quintal", "variety": "Bold", "price": 6200, "location": "Ahmedabad"},
    {"name": "Sunflower", "category": "Cash Crop", "unit": "quintal", "variety": "Hybrid", "price": 6600, "location": "Solapur"},
    {"name": "Mustard", "category": "Cash Crop", "unit": "quintal", "variety": "Pusa Bold", "price": 5400, "location": "Jaipur"},
    {"name": "Turmeric", "category": "Spice", "unit": "quintal", "variety": "Salem", "price": 14500, "location": "Coimbatore"},
    {"name": "Ginger", "category": "Spice", "unit": "quintal", "variety": "Fresh", "price": 8200, "location": "Coimbatore"},
    {"name": "Black Pepper", "category": "Spice", "unit": "quintal", "variety": "Malabar", "price": 52000, "location": "Kochi"},
    {"name": "Cardamom", "category": "Spice", "unit": "quintal", "variety": "Green", "price": 145000, "location": "Kochi"},
    {"name": "Green Chilli", "category": "Vegetable", "unit": "kg", "variety": "Local", "price": 32, "location": "Ludhiana"},
    {"name": "Alphonso Mango", "category": "Fruit", "unit": "kg", "variety": "Alphonso", "price": 95, "location": "Ratnagiri"},
    {"name": "Banana", "category": "Fruit", "unit": "kg", "variety": "Robusta", "price": 28, "location": "Ratnagiri"},
    {"name": "Pomegranate", "category": "Fruit", "unit": "kg", "variety": "Bhagwa", "price": 65, "location": "Nashik"},
    {"name": "Grapes", "category": "Fruit", "unit": "kg", "variety": "Thompson Seedless", "price": 55, "location": "Nashik"},
    {"name": "Watermelon", "category": "Fruit", "unit": "kg", "variety": "Sugar Baby", "price": 12, "location": "Agra"},
    {"name": "Papaya", "category": "Fruit", "unit": "kg", "variety": "Red Lady", "price": 22, "location": "Salem"},
    {"name": "Guava", "category": "Fruit", "unit": "kg", "variety": "Allahabad Safeda", "price": 38, "location": "Kanpur"},
    {"name": "Orange", "category": "Fruit", "unit": "kg", "variety": "Nagpur Santra", "price": 48, "location": "Nagpur"},
]

MARKETS = [
    "Nashik APMC", "Pune Market Yard", "Indore Mandi", "Bengaluru Yeshwantpur", "Ludhiana Grain Market",
    "Hyderabad Bowenpally", "Agra Mandi", "Jaipur Grain Market", "Coimbatore Spice Exchange",
    "Nagpur Cotton Market", "Ahmedabad Krishi Bazar", "Warangal Agri Market", "Kochi Spice Terminal",
    "Vijayawada Rythu Bazar", "Amritsar Grain Market", "Kanpur Mandi", "Mysuru APMC", "Solapur Market Yard",
    "Chandigarh Grain Market", "Salem Fruit Market",
]

# ---------------------------------------------------------------------------
# Programmatic generation — extends the named/recognizable entries above with
# additional realistic accounts so the marketplace has real depth. The first
# entries in each list (and hence the *@kisansetu.demo primary demo accounts)
# are untouched by this — it only appends more.
# ---------------------------------------------------------------------------

_FIRST_NAMES = [
    "Amit", "Deepa", "Rahul", "Pooja", "Sanjay", "Neha", "Vijay", "Kavita", "Ajay", "Ritu",
    "Sunil", "Anjali", "Manoj", "Preeti", "Rajiv", "Swati", "Nitin", "Shalini", "Vikas", "Anita",
    "Prakash", "Meenakshi", "Ravi", "Sunita", "Gopal", "Radha", "Dinesh", "Usha", "Mahesh", "Kamla",
    "Yogesh", "Bharti", "Naresh", "Seema", "Ashwin", "Rekha", "Sandeep", "Manju", "Vinod", "Jyoti",
]
_LAST_NAMES = [
    "Sharma", "Verma", "Patil", "Reddy", "Iyer", "Nair", "Gupta", "Singh", "Kulkarni", "Joshi",
    "Mehta", "Shah", "Rao", "Chauhan", "Deshmukh", "Bhat", "Pillai", "Agarwal", "Kapoor", "Malhotra",
    "Naik", "Pawar", "Yadav", "Bhandari", "Krishnan", "Menon", "Trivedi", "Sinha", "Chatterjee", "Banerjee",
]
_AGRI_LOCATIONS = [
    ("Nashik", "Maharashtra"), ("Pune", "Maharashtra"), ("Nagpur", "Maharashtra"), ("Kolhapur", "Maharashtra"),
    ("Solapur", "Maharashtra"), ("Aurangabad", "Maharashtra"), ("Indore", "Madhya Pradesh"), ("Ujjain", "Madhya Pradesh"),
    ("Bhopal", "Madhya Pradesh"), ("Bengaluru", "Karnataka"), ("Mysuru", "Karnataka"), ("Belagavi", "Karnataka"),
    ("Hyderabad", "Telangana"), ("Warangal", "Telangana"), ("Ludhiana", "Punjab"), ("Amritsar", "Punjab"),
    ("Jalandhar", "Punjab"), ("Patiala", "Punjab"), ("Ahmedabad", "Gujarat"), ("Surat", "Gujarat"),
    ("Rajkot", "Gujarat"), ("Agra", "Uttar Pradesh"), ("Kanpur", "Uttar Pradesh"), ("Lucknow", "Uttar Pradesh"),
    ("Meerut", "Uttar Pradesh"), ("Varanasi", "Uttar Pradesh"), ("Jaipur", "Rajasthan"), ("Jodhpur", "Rajasthan"),
    ("Coimbatore", "Tamil Nadu"), ("Madurai", "Tamil Nadu"), ("Salem", "Tamil Nadu"), ("Chennai", "Tamil Nadu"),
    ("Kochi", "Kerala"), ("Thrissur", "Kerala"), ("Vijayawada", "Andhra Pradesh"), ("Guntur", "Andhra Pradesh"),
    ("Nellore", "Andhra Pradesh"), ("Bhubaneswar", "Odisha"), ("Ranchi", "Jharkhand"), ("Patna", "Bihar"),
    ("Guwahati", "Assam"), ("Chandigarh", "Chandigarh"), ("Dehradun", "Uttarakhand"), ("Shimla", "Himachal Pradesh"),
]
_BUYER_BIZ_TEMPLATES = [
    "{last} Foods Pvt Ltd", "{last} Agro Traders", "{city} Fresh Mart", "{last} Wholesale Foods",
    "{last} Retail Group", "{city} Distribution Co", "{last} Exports", "{last} Agri Ventures",
    "{city} Bulk Foods", "{last} & Sons Trading",
]
_SELLER_BIZ_TEMPLATES = [
    "{last} Farms", "{city} Growers", "{last} Agro Producers", "{city} Organic Farms",
    "{last} Family Farms", "{city} Farmers Collective", "{last} Agro Industries", "{city} Harvest Co",
]


def _generate_people(count, start_index, email_prefix, biz_templates):
    out, used = [], set()
    for i in range(count):
        for _ in range(50):  # bounded retry to avoid an exact repeat combo
            first, last = random.choice(_FIRST_NAMES), random.choice(_LAST_NAMES)
            city, state = random.choice(_AGRI_LOCATIONS)
            key = (first, last, city)
            if key not in used:
                used.add(key)
                break
        biz = random.choice(biz_templates).format(last=last, city=city)
        out.append({
            "email": f"{email_prefix}{start_index + i}@kisansetu.demo",
            "name": f"{first} {last}", "business": biz, "city": city, "state": state,
        })
    return out


BUYERS += _generate_people(16, 9, "buyer", _BUYER_BIZ_TEMPLATES)
SELLERS += _generate_people(28, 15, "seller", _SELLER_BIZ_TEMPLATES)
QUALITY_OFFICERS += [
    {"email": f"quality{5 + i}@kisansetu.demo", "name": f"{random.choice(_FIRST_NAMES)} {random.choice(_LAST_NAMES)}"}
    for i in range(8)
]

CHAT_SCRIPTS = [
    [
        ("BUYER", "We can take {qty} {unit} if Grade A is maintained."),
        ("SELLER", "We can offer ₹{p1}/{unit} with pickup from {loc}."),
        ("BUYER", "Can you do ₹{p2}/{unit}?"),
        ("SELLER", "We can do ₹{p3}/{unit} with payment within 3 days."),
        ("BUYER", "Works for us. Confirming at ₹{p3}/{unit}."),
    ],
    [
        ("BUYER", "What quality grade can you guarantee for this lot?"),
        ("SELLER", "Grade A, moisture under 12%, freshly harvested this week."),
        ("BUYER", "Good. Can delivery happen by the weekend?"),
        ("SELLER", "Yes, we can arrange pickup by Friday."),
    ],
    [
        ("SELLER", "We have {qty} {unit} ready for dispatch from {loc}."),
        ("BUYER", "Send us your best price for the full quantity."),
        ("SELLER", "₹{p1}/{unit}, payment on delivery."),
        ("BUYER", "Let's finalize at ₹{p3}/{unit}, with a partial advance."),
    ],
]


def run():
    reset_schema()
    db = SessionLocal()

    print("Creating users & profiles...")
    buyer_users, seller_users = [], []

    for i, b in enumerate(BUYERS):
        when = spread_days_ago(i, len(BUYERS), max_days=90, min_days=20)
        u = make_user(db, b["email"], "BUYER", b["name"], when, phone=f"98765{10000+i}")
        profile = BuyerProfile(
            user_id=u.id, business_name=b["business"], city=b["city"], state=b["state"],
            address=f"{b['business']}, {b['city']}", pincode="560001", verification_status="VERIFIED",
            created_at=when,
        )
        db.add(profile)
        db.flush()
        buyer_users.append((u, profile))

    for i, s in enumerate(SELLERS):
        when = spread_days_ago(i, len(SELLERS), max_days=85, min_days=15)
        u = make_user(db, s["email"], "SELLER", s["name"], when, phone=f"91234{20000+i}")
        profile = SellerProfile(
            user_id=u.id, display_name=s["business"], seller_type="FARMER", city=s["city"], state=s["state"],
            address=f"{s['business']}, {s['city']}", pincode="422001", verification_status="VERIFIED",
            created_at=when,
        )
        db.add(profile)
        db.flush()
        db.add(Farm(
            seller_id=profile.id, name=f"{s['business']} Main Farm", area_acres=round(random.uniform(3, 25), 1),
            village=s["city"], district=s["city"], state=s["state"],
            latitude=round(random.uniform(15.0, 30.0), 6), longitude=round(random.uniform(74.0, 80.0), 6),
            created_at=when,
        ))
        seller_users.append((u, profile))

    # farmer_sellers captured here — individual farms only, before FPO managers are added below.
    # Used wherever we want a single farm as seller-of-record (product listings, quotes, contracts).
    farmer_sellers = seller_users.copy()

    for i, fpo_def in enumerate(FPOS):
        fpo_when = spread_days_ago(i, len(FPOS), max_days=50, min_days=30)
        fpo_user = make_user(db, fpo_def["email"], "FPO_MANAGER", fpo_def["name"], fpo_when, phone=f"900000{1000+i}")
        fpo_profile = SellerProfile(
            user_id=fpo_user.id, display_name=fpo_def["business"], seller_type="FPO", city=fpo_def["city"], state=fpo_def["state"],
            address=f"{fpo_def['business']}, {fpo_def['city']}", pincode=f"{422000+i}", verification_status="VERIFIED", created_at=fpo_when,
        )
        db.add(fpo_profile)
        db.flush()
        fpo_org = Fpo(name=fpo_def["business"], registration_no=f"FPO-{2020+i}-{100+i}", state=fpo_def["state"], manager_user_id=fpo_user.id, created_at=fpo_when)
        db.add(fpo_org)
        db.flush()
        fpo_profile.fpo_id = fpo_org.id
        seller_users.append((fpo_user, fpo_profile))

    quality_users = []
    for i, q in enumerate(QUALITY_OFFICERS):
        when = spread_days_ago(i, len(QUALITY_OFFICERS), max_days=45, min_days=10)
        u = make_user(db, q["email"], "FIELD_OFFICER", q["name"], when, phone=f"9888800{i}0")
        quality_users.append(u)

    admin_users = []
    for i, a in enumerate(ADMINS):
        when = spread_days_ago(i, len(ADMINS), max_days=70, min_days=40)
        admin_users.append(make_user(db, a["email"], "ADMIN", a["name"], when))
    admin_user = admin_users[0]  # primary demo admin, used below for a few seeded audit entries

    db.commit()
    print(f"  {len(buyer_users)} buyers, {len(farmer_sellers)} sellers, {len(FPOS)} FPOs, {len(quality_users)} quality officers, {len(admin_users)} admins")

    # -----------------------------------------------------------------
    print("Creating products & availability...")
    products = []
    for seller_u, seller_p in farmer_sellers:
        n_listings = random.randint(2, 4)
        catalog_picks = random.sample(PRODUCT_CATALOG, n_listings)
        for j, p in enumerate(catalog_picks):
            when = days_ago(random.randint(15, 42))
            prod = Product(
                seller_id=seller_p.id, name=p["name"], category=p["category"], variety=p["variety"],
                unit=p["unit"], description=f"Fresh {p['name']} sourced directly from {seller_p.display_name}.",
                indicative_price=round(p["price"] * random.uniform(0.94, 1.06), 2), location=seller_p.city, active=True, created_at=when,
            )
            db.add(prod)
            db.flush()
            db.add(ProductAvailability(
                product_id=prod.id, quantity=random.randint(1500, 25000), unit=p["unit"],
                grade=random.choice(["A", "A", "B"]), available_from=(NOW - timedelta(days=5)).date(),
                available_to=(NOW + timedelta(days=25)).date(), created_at=when,
            ))
            log(db, seller_u.id, "PRODUCT_CREATED", "product", prod.id, after={"name": prod.name}, when=when)
            products.append((prod, seller_u, seller_p))
    db.commit()
    print(f"  {len(products)} products")

    # -----------------------------------------------------------------
    print("Creating market price history...")
    market_count = 0
    seen_names = {}
    for p in PRODUCT_CATALOG:
        if p["name"] in seen_names:
            continue  # avoid duplicate price series for the same crop (e.g. two Cotton varieties)
        seen_names[p["name"]] = True
        base_price = p["price"]
        for d in range(90):
            when = min(days_ago(89 - d, hour=9), NOW - timedelta(minutes=5))
            drift = random.uniform(-0.06, 0.06)
            price = round(base_price * (1 + drift + 0.001 * d), 2)
            db.add(MarketPrice(
                product_name=p["name"], market=random.choice(MARKETS), location=p["location"],
                price=price, unit=p["unit"], observed_at=when, source="KISANSETU Market Feed (seed)",
                created_at=when,
            ))
            market_count += 1
    db.commit()
    print(f"  {market_count} market price observations")

    # -----------------------------------------------------------------
    print("Creating buyer requirements, quotes, negotiations...")

    status_cycle = ["OPEN", "OPEN", "QUOTES_RECEIVED", "QUOTES_RECEIVED", "NEGOTIATING", "NEGOTIATING", "CLOSED", "CLOSED", "CLOSED"]
    req_status_plan = [status_cycle[i % len(status_cycle)] for i in range(108)]
    requirements = []
    for i, status in enumerate(req_status_plan):
        buyer_u, buyer_p = buyer_users[i % len(buyer_users)]
        prod, _, _ = products[i % len(products)]
        when = spread_days_ago(i, len(req_status_plan), max_days=70, min_days=35)
        req = BuyerRequirement(
            buyer_id=buyer_p.id, product_id=prod.id, product_name=prod.name,
            quantity=random.randint(1000, 8000), unit=prod.unit,
            target_price=round(float(prod.indicative_price) * random.uniform(1.0, 1.15), 2),
            delivery_location=random.choice(["Pune", "Bengaluru", "Hyderabad", "Mumbai", "Chennai", "Delhi", "Ahmedabad"]),
            delivery_from=(NOW + timedelta(days=7)).date(), delivery_to=(NOW + timedelta(days=21)).date(),
            quality_requirement={"grade": "A"}, notes="Standard quality checks apply on delivery.",
            status=status, created_at=when, updated_at=when,
        )
        db.add(req)
        db.flush()
        log(db, buyer_u.id, "REQUIREMENT_CREATED", "buyer_requirement", req.id, after={"product_name": prod.name}, when=when)
        requirements.append((req, buyer_u, buyer_p, prod, when))
    db.commit()
    print(f"  {len(requirements)} buyer requirements")

    quotes_created = []
    quote_count = 0
    for req, buyer_u, buyer_p, prod, req_when in requirements:
        if req.status == "OPEN":
            continue
        n_quotes = random.choice([2, 2, 3, 3, 4])
        chosen_sellers = random.sample(farmer_sellers, min(n_quotes, len(farmer_sellers)))
        for si, (seller_u, seller_p) in enumerate(chosen_sellers):
            q_when = req_when + timedelta(days=1, hours=si)
            base_price = float(req.target_price) * random.uniform(0.94, 1.04)
            q = Quote(
                requirement_id=req.id, seller_id=seller_p.id, quantity=req.quantity, unit_price=round(base_price, 2),
                delivery_terms=f"Pickup from {seller_p.city}", payment_terms="Payment within 3 days of delivery",
                status="SUBMITTED", created_at=q_when, updated_at=q_when,
            )
            db.add(q)
            db.flush()
            v1_terms = {"unit_price": q.unit_price, "quantity": float(q.quantity), "delivery_terms": q.delivery_terms, "payment_terms": q.payment_terms}
            db.add(QuoteVersion(quote_id=q.id, version_no=1, terms_json=v1_terms, proposed_by_role="SELLER", created_by=seller_u.id, created_at=q_when))
            log(db, seller_u.id, "QUOTE_CREATED", "quote", q.id, after=v1_terms, when=q_when)

            thread = ChatThread(quote_id=q.id, buyer_id=buyer_p.id, seller_id=seller_p.id, created_at=q_when)
            db.add(thread)
            db.flush()

            script = random.choice(CHAT_SCRIPTS)
            p1 = q.unit_price
            p2 = round(p1 * 0.98, 2)
            p3 = round((p1 + p2) / 2, 2)
            msg_time = q_when + timedelta(hours=1)
            for role, template in script:
                sender = buyer_u if role == "BUYER" else seller_u
                body = template.format(qty=int(req.quantity), unit=req.unit, p1=p1, p2=p2, p3=p3, loc=seller_p.city)
                db.add(ChatMessage(thread_id=thread.id, sender_id=sender.id, body=body, created_at=msg_time))
                msg_time += timedelta(minutes=random.randint(10, 90))

            version_no = 1
            final_terms = v1_terms
            if req.status in ("NEGOTIATING", "CLOSED"):
                version_no = 2
                counter_terms = {**v1_terms, "unit_price": p2}
                c_when = q_when + timedelta(hours=3)
                db.add(QuoteVersion(quote_id=q.id, version_no=2, terms_json=counter_terms, proposed_by_role="BUYER", created_by=buyer_u.id, created_at=c_when))
                log(db, buyer_u.id, "QUOTE_COUNTERED", "quote", q.id, before=v1_terms, after=counter_terms, when=c_when)
                q.status = "COUNTERED"
                final_terms = counter_terms

                if req.status == "CLOSED" and si == 0:
                    version_no = 3
                    accept_terms = {**counter_terms, "unit_price": p3}
                    a_when = c_when + timedelta(hours=2)
                    db.add(QuoteVersion(quote_id=q.id, version_no=3, terms_json=accept_terms, proposed_by_role="SELLER", created_by=seller_u.id, created_at=a_when))
                    log(db, seller_u.id, "QUOTE_COUNTERED", "quote", q.id, before=counter_terms, after=accept_terms, when=a_when)
                    final_terms = accept_terms

            q.unit_price = final_terms["unit_price"]
            quote_count += 1
            is_winning = (req.status == "CLOSED" and si == 0)
            quotes_created.append((q, req, buyer_u, buyer_p, seller_u, seller_p, prod, final_terms, is_winning, q_when))
    db.commit()
    print(f"  {quote_count} quotes with negotiation history and chat threads")

    # -----------------------------------------------------------------
    print("Creating contracts across the full lifecycle...")

    winning_quotes = [row for row in quotes_created if row[8]]
    # A larger, repeating cycle across every valid contract status — gives real
    # volume everywhere (buyer/seller/admin dashboards, reports, audit trail)
    # while still guaranteeing every status is represented for the demo.
    status_rotation = [
        "ACCEPTED", "GROWING", "GROWING", "READY", "PICKED_UP", "INSPECTED",
        "DELIVERED", "PAID", "COMPLETED", "COMPLETED", "COMPLETED", "AT_RISK", "DISPUTED",
    ]
    target_statuses = [status_rotation[i % len(status_rotation)] for i in range(108)]

    contracts_info = []
    pool = list(winning_quotes)  # consume each winning quote at most once — a quote should map to at most one contract
    for i, target_status in enumerate(target_statuses):
        if pool:
            q, req, buyer_u, buyer_p, seller_u, seller_p, prod, terms, _, q_when = pool.pop(0)
        else:
            req, buyer_u, buyer_p, prod, q_when = requirements[i % len(requirements)]
            seller_u, seller_p = farmer_sellers[i % len(farmer_sellers)]
            terms = {"unit_price": float(prod.indicative_price), "quantity": random.randint(1500, 6000), "delivery_terms": f"Pickup from {seller_p.city}", "payment_terms": "Payment within 3 days of delivery"}
            q = None

        c_when = q_when + timedelta(days=1)
        qty = float(terms.get("quantity", 3000))
        unit_price = float(terms["unit_price"])
        total_value = round(qty * unit_price, 2)
        contract_no = f"KS-{c_when.strftime('%Y%m')}-{str(uuid.uuid4())[:6].upper()}"

        contract = Contract(
            contract_no=contract_no, buyer_id=buyer_p.id, seller_id=seller_p.id,
            requirement_id=req.id, quote_id=(q.id if q else None), product_name=prod.name,
            quantity=qty, unit=prod.unit, unit_price=unit_price, total_value=total_value,
            quality_grade="A", delivery_terms=terms.get("delivery_terms"), payment_terms=terms.get("payment_terms"),
            status="ACCEPTED", created_at=c_when, updated_at=c_when,
        )
        db.add(contract)
        db.flush()

        content_hash = hashlib.sha256(json.dumps(terms, sort_keys=True, default=str).encode()).hexdigest()
        db.add(ContractVersion(
            contract_id=contract.id, version_no=1, terms_json=terms, content_hash=content_hash,
            created_by=buyer_u.id, accepted_by=seller_u.id, accepted_at=c_when, created_at=c_when,
        ))
        log(db, buyer_u.id, "QUOTE_ACCEPTED", "quote", (q.id if q else contract.id), after=terms, when=c_when)
        log(db, buyer_u.id, "CONTRACT_CREATED", "contract", contract.id, after={"contract_no": contract_no}, when=c_when)
        notify(db, seller_u.id, "Contract created!", f"Contract {contract_no} created for {prod.name}", f"/seller/contracts/{contract.id}", when=c_when)
        notify(db, buyer_u.id, "Contract created!", f"Contract {contract_no} created for {prod.name}", f"/buyer/contracts/{contract.id}", when=c_when)

        contracts_info.append({
            "contract": contract, "buyer_u": buyer_u, "seller_u": seller_u, "buyer_p": buyer_p, "seller_p": seller_p,
            "prod": prod, "target_status": target_status, "c_when": c_when, "total_value": total_value,
        })
    db.commit()

    # progress each contract's milestones/lots/quality/payments toward its target status
    STAGE_INDEX = {s: i for i, s in enumerate(
        ["ACCEPTED", "GROWING", "READY", "PICKED_UP", "INSPECTED", "DELIVERED", "PAID", "COMPLETED"]
    )}
    qo_cycle = iter(quality_users * 20)

    for info in contracts_info:
        contract = info["contract"]
        buyer_u, seller_u = info["buyer_u"], info["seller_u"]
        buyer_p, seller_p = info["buyer_p"], info["seller_p"]
        c_when = info["c_when"]
        target = info["target_status"]
        stage_target = STAGE_INDEX.get(target, 1)

        t = c_when
        # milestone 0 = CONTRACT_ACCEPTED, always done
        db.add(ContractMilestone(contract_id=contract.id, milestone_type="CONTRACT_ACCEPTED", status="DONE",
                                  completed_at=t, completed_by=buyer_u.id, created_at=c_when))

        lots = []
        delivery = None
        for idx, m_type in enumerate(MILESTONE_SEQUENCE[1:], start=1):
            reached = idx <= stage_target or target in ("AT_RISK", "DISPUTED") and idx <= 2
            t = t + timedelta(days=random.randint(1, 3))
            if reached and t <= NOW:
                db.add(ContractMilestone(contract_id=contract.id, milestone_type=m_type, status="DONE",
                                          completed_at=t, completed_by=seller_u.id, created_at=c_when))
                log(db, seller_u.id, "MILESTONE_COMPLETED", "contract_milestone", contract.id, after={"type": m_type}, when=t)

                if m_type == "PICKUP" and not lots:
                    # Large orders realistically get split into multiple lots at pickup
                    qty = float(contract.quantity)
                    n_lots = 3 if qty > 5500 else (2 if qty > 1800 else 1)
                    remaining = qty
                    for li in range(n_lots):
                        lot_qty = round(qty / n_lots, 2) if li < n_lots - 1 else round(remaining, 2)
                        remaining -= lot_qty
                        lot = Lot(contract_id=contract.id, product_id=info["prod"].id,
                                   lot_code=f"LOT-{contract.contract_no}-{li+1:02d}", quantity=lot_qty, unit=contract.unit,
                                   qr_token=secrets.token_urlsafe(16), created_at=t)
                        db.add(lot)
                        db.flush()
                        log(db, seller_u.id, "LOT_CREATED", "lot", lot.id, after={"lot_code": lot.lot_code}, when=t)
                        lots.append(lot)

                if m_type == "QUALITY_INSPECTION" and lots:
                    for lot in lots:
                        qo = next(qo_cycle)
                        result = "PASS" if random.random() > 0.15 else "FAIL"
                        insp = Inspection(lot_id=lot.id, contract_id=contract.id, assigned_to=qo.id, status=result,
                                           inspected_at=t, notes="Routine quality check on arrival.", created_at=t)
                        db.add(insp)
                        db.flush()
                        params = {"Tomato": ["Grade", "Size", "Damage", "Colour"], "Basmati Rice": ["Moisture", "Broken grains", "Foreign matter", "Grade"]}
                        for param in params.get(info["prod"].name, ["Grade", "Moisture", "Damage"]):
                            db.add(InspectionResult(inspection_id=insp.id, parameter=param,
                                                     measured_value="OK" if result == "PASS" else "Below spec", result=result))
                        log(db, qo.id, "INSPECTION_CREATED", "inspection", insp.id, after={"status": result}, when=t)
                        if result == "PASS":
                            log(db, qo.id, "QUALITY_APPROVED", "inspection", insp.id, when=t)
                    notify(db, buyer_u.id, "Quality inspection completed", f"{len(lots)} lot(s) inspected for {contract.contract_no}", f"/buyer/contracts/{contract.id}/quality", when=t)

                if m_type == "DELIVERY":
                    dispatch_when = t - timedelta(days=random.randint(1, 2))
                    expected_when = dispatch_when + timedelta(days=random.randint(2, 5))
                    delivered_late = target == "AT_RISK" or random.random() < 0.12
                    actual_when = t if reached else None
                    delivery = Delivery(
                        contract_id=contract.id, lot_id=lots[0].id if lots else None,
                        quantity=contract.quantity, unit=contract.unit,
                        origin=seller_p.city, destination=buyer_p.city,
                        dispatch_date=dispatch_when, expected_delivery_date=expected_when,
                        actual_delivery_date=actual_when,
                        status="DELIVERED" if actual_when else "IN_TRANSIT",
                        delay_reason="Regional transport congestion delayed pickup by a day." if delivered_late and actual_when and actual_when > expected_when else None,
                        created_at=dispatch_when,
                    )
                    db.add(delivery)
                    db.flush()
                    log(db, seller_u.id, "DELIVERY_DISPATCHED", "delivery", delivery.id, when=dispatch_when)
                    if actual_when:
                        log(db, seller_u.id, "DELIVERY_COMPLETED", "delivery", delivery.id, when=actual_when)
                    notify(db, buyer_u.id, "Delivery milestone reached", f"Contract {contract.contract_no}", f"/buyer/contracts/{contract.id}", when=t)

                if m_type == "PAYMENT":
                    contract.status = "COMPLETED"
            else:
                db.add(ContractMilestone(contract_id=contract.id, milestone_type=m_type, status="PENDING", created_at=c_when))

        # payments
        if stage_target >= STAGE_INDEX["DELIVERED"] or target in ("PAID", "COMPLETED"):
            pay_status = "PAID"
        elif stage_target >= STAGE_INDEX["PICKED_UP"]:
            pay_status = random.choice(["DUE", "DUE", "PROCESSING", "OVERDUE"])
        else:
            pay_status = None

        if target == "COMPLETED":
            pay_status = "PAID"
        if target == "DISPUTED":
            pay_status = "FAILED"

        if pay_status:
            pay_when = t + timedelta(hours=4)
            payment = Payment(
                contract_id=contract.id, payer_id=buyer_u.id, payee_id=seller_u.id, amount=info["total_value"],
                currency="INR", status=pay_status, provider_ref=f"SIM-{secrets.token_hex(6).upper()}",
                paid_at=pay_when if pay_status == "PAID" else None, created_at=pay_when,
            )
            db.add(payment)
            db.flush()
            log(db, buyer_u.id, "PAYMENT_CREATED", "payment", payment.id, after={"amount": info["total_value"]}, when=pay_when)
            if pay_status == "PAID":
                log(db, buyer_u.id, "PAYMENT_COMPLETED", "payment", payment.id, when=pay_when)
                notify(db, seller_u.id, "Payment received", f"₹{info['total_value']:.0f} for {contract.contract_no}", f"/seller/contracts/{contract.id}/payments", when=pay_when)

        # apply final status / risk / dispute
        if target == "AT_RISK":
            contract.status = "AT_RISK"
            risk_severity = random.choice(["MEDIUM", "HIGH"])
            risk_reason = f"Pickup for {contract.contract_no} is running behind schedule."
            db.add(RiskEvent(contract_id=contract.id, event_type="DELIVERY_DELAY",
                              severity=risk_severity, description=risk_reason, created_at=t))
            notify(db, buyer_u.id, f"Contract {contract.contract_no} is at {risk_severity.lower()} delivery risk", risk_reason, f"/buyer/contracts/{contract.id}", when=t)
            notify(db, seller_u.id, f"Contract {contract.contract_no} is at {risk_severity.lower()} delivery risk", risk_reason, f"/seller/contracts/{contract.id}", when=t)
        elif target == "DISPUTED":
            contract.status = "DISPUTED"
            db.add(Dispute(contract_id=contract.id, raised_by=buyer_u.id,
                            reason="Delivered quantity was short of the contracted amount.",
                            status="OPEN", created_at=t))
            log(db, buyer_u.id, "DISPUTE_OPENED", "dispute", contract.id, when=t)
        elif target != "COMPLETED":
            contract.status = target

        contract.updated_at = t

    db.commit()
    print(f"  {len(contracts_info)} contracts with milestones, lots, quality, payments across the lifecycle")

    # -----------------------------------------------------------------
    print("Creating additional system notifications...")
    for buyer_u, _ in buyer_users:
        notify(db, buyer_u.id, "Welcome to KISANSETU", "Explore products and post your first requirement.", "/buyer/products", when=days_ago(55))
    for seller_u, _ in seller_users:
        notify(db, seller_u.id, "Welcome to KISANSETU", "Complete your profile and list your first product.", "/seller/products", when=days_ago(50))

    # Price-movement alerts, computed from the real market price series we just seeded —
    # not fabricated numbers. Sent to buyers/sellers with an active requirement or
    # product listing in that crop.
    from app.services import intelligence as intel
    notified_crops = random.sample(list({p["name"] for p in PRODUCT_CATALOG}), min(8, len(PRODUCT_CATALOG)))
    for crop in notified_crops:
        pi = intel.price_intelligence(db, crop)
        if not pi or pi["pct_change_30day"] == 0:
            continue
        direction = "increased" if pi["pct_change_30day"] > 0 else "fallen"
        recipients = [
            u for u, p in buyer_users if db.query(BuyerRequirement).filter(
                BuyerRequirement.buyer_id == p.id, BuyerRequirement.product_name == crop
            ).first()
        ][:3]
        for u in recipients:
            notify(db, u.id, f"{crop} prices {direction} {abs(pi['pct_change_30day'])}%",
                   f"Current market price: ₹{pi['current_price']}/{pi['unit']}", "/market", when=days_ago(random.randint(1, 5)))

    db.commit()

    # -----------------------------------------------------------------
    audit_count = db.query(AuditLog).count()
    print(f"Total audit log entries: {audit_count}")

    db.close()
    print("\nSeed complete.")
    print("Demo credentials (password for all: Password123!):")
    for e in [b["email"] for b in BUYERS] + [s["email"] for s in SELLERS] + [f["email"] for f in FPOS] + [q["email"] for q in QUALITY_OFFICERS] + [a["email"] for a in ADMINS]:
        print(f"  {e}")


if __name__ == "__main__":
    run()
