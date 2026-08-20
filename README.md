# KISANSETU

**KISANSETU v6 — Final Hackathon Build**

A fully connected agricultural procurement and contract platform — buyers, sellers/farmers, FPOs, quality
officers, and management, all working off one real SQL database, with a real backend enforcing every
business rule and permission.

> This is a hackathon demo build with realistic, clearly-synthetic seeded data (see [Demo Accounts](#7-demo-accounts)
> below). No real money moves and no real transaction is represented as genuine.

---

## Table of Contents

1. [Project Introduction](#1-project-introduction)
2. [Key Features](#2-key-features)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Project Structure](#5-project-structure)
6. [Database](#6-database)
7. [Demo Accounts](#7-demo-accounts)
8. [How to Run](#8-how-to-run)
9. [Environment Variables](#9-environment-variables)
10. [Database Commands](#10-database-commands)
11. [Troubleshooting](#11-troubleshooting)
12. [Deployment](#12-deployment)
13. [Future Improvements](#13-future-improvements)
14. [Project Status](#14-project-status)

---

## 1. Project Introduction

**KISANSETU** ("Farmer Bridge") is a digital agricultural procurement and contract platform that connects
agricultural **buyers** directly with **farmers, sellers, and FPOs (Farmer Producer Organisations)** —
replacing the usual chain of intermediaries with one transparent, auditable marketplace.

**The problem it solves:** in most agricultural supply chains, price discovery is opaque, quality
disputes happen after money has changed hands, payments are delayed with no visibility, and there's no
shared record either side can point to. KISANSETU puts requirement posting, negotiation, contracting,
quality inspection, delivery, and payment on one connected system, with a real backend-enforced audit
trail at every step.

**Who it's for:**
- **Buyers** — food processors, retailers, and distributors sourcing produce and grain directly from farms
- **Sellers / Farmers** — individual growers listing produce and responding to buyer demand
- **FPOs** — Farmer Producer Organisations aggregating supply across many member farmers
- **Quality Officers** — field inspectors recording grade/quality outcomes against a contract's standard
- **Admin / Management** — platform operations, dispute resolution, and oversight

**The vision:** one connected platform where a deal's entire lifecycle — from a buyer's first "Get Quote"
request through negotiation, contract, quality inspection, delivery, and payment — is backed by real
database records and visible to every party involved, with nothing hidden behind a UI that merely *looks*
functional.

---

## 2. Key Features

Everything below is implemented and running against the real database — nothing here is a frontend mock.

**Public marketplace**
- Product discovery with search and category filtering
- Market Intelligence page: live price data, 7/30/90-day trend charts, location filtering
- Digital Produce Passport — scan/open a lot's QR code to see its full farm-to-payment traceability timeline

**Buyer**
- Dashboard with live requirement/contract/payment KPIs
- Browse products, post "Get Quote" requirements
- Real-time negotiation chat with sellers, with an AI-suggested counter-offer panel (compares the current
  quote to the real 30-day market average; the user must explicitly click to use the suggestion — nothing
  is auto-sent)
- **Procurement Copilot** — search a crop and get live price/demand/forecast data plus a ranked list of
  suppliers with computed Deal Scores
- Contract tracking with a visual milestone timeline, quality results, and payment status
- Payment simulator (DUE → PROCESSING → PAID)

**Seller / Farmer / FPO**
- Dashboard with **"What Should I Sell?"** — per-crop sell-now/hold recommendations from real price trend
  and demand data
- List products, view and respond to buyer opportunities, negotiate, manage contracts

**Quality Officer**
- Record quality inspections (grade, pass/fail, measured parameters) against a specific lot

**Admin / Management**
- **Operations Command Center** — a "Requires Attention" panel surfacing at-risk contracts, pending
  inspections, overdue payments, and disputes, each linking straight to the filtered view
- Procurement Overview KPIs (total value, fulfillment rate, average quality, at-risk exposure, average
  deal score) — all computed live from the database, never hardcoded
- User, contract, quality, payment, market, and dispute management
- Append-only audit log

**Platform-wide**
- JWT authentication with role-based access control **enforced on the backend** on every endpoint — not
  just hidden in the UI (a buyer cannot read or modify another buyer's or seller's contracts, quotes,
  payments, or negotiation chat, even by guessing a URL)
- Versioned quote negotiation — every counter-offer is preserved, never overwritten
- Full contract lifecycle state machine (DRAFT → NEGOTIATING → ACCEPTED → GROWING → READY → PICKED_UP →
  INSPECTED → DELIVERED → PAID → COMPLETED, with AT_RISK / DISPUTED / CANCELLED exception states)
- Lot-level QR traceability, with large orders realistically split across multiple lots
- Delivery tracking (dispatch/expected/actual dates, delay reasons)
- **Procurement Intelligence** — price forecasting (real linear regression over actual price history,
  with an honestly-computed confidence level), deal scoring, supplier scoring, and contract risk scoring.
  All deterministic and computed from real database rows; there is no external AI API call anywhere in
  this build
- Notifications tied to real events (new quotes, counter-offers, contract creation, quality results,
  payments, price movements, delivery risk)
- Consistent, data-driven product imagery — every product has an illustrated icon from one shared visual
  system (see note in [Future Improvements](#13-future-improvements) on why these are illustrations, not
  photographs)
- Realistic, internally-consistent seeded demo data across every entity (see [Database](#6-database))

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript | UI framework and routing |
| Styling | Tailwind CSS | Utility-first styling, custom warm cream/tan theme |
| Charts | Recharts | Market price trends, admin dashboard charts |
| Icons | lucide-react | Icon set |
| Backend | FastAPI (Python 3.12), Uvicorn | REST API server |
| ORM / Migrations | SQLAlchemy 2.0, Alembic | Database models and schema migrations |
| Database | PostgreSQL 16 | Primary data store |
| Authentication | JWT (python-jose) + bcrypt (passlib) | Token-based auth, password hashing |
| Realtime | FastAPI native WebSockets | Negotiation chat |
| Testing | Pytest, FastAPI TestClient | Backend test suite |
| Containerization | Docker, Docker Compose | Local orchestration of db/api/web |

---

## 4. Architecture

```
User (Browser)
      │  HTTPS
      ▼
Next.js Frontend  (client-rendered pages, App Router)  — port 3000
      │  REST / JSON + WebSocket, JWT bearer auth
      ▼
FastAPI Backend  (routers → services → SQLAlchemy models)  — port 8000
      │  SQL, via SQLAlchemy ORM, schema managed by Alembic
      ▼
PostgreSQL Database  — port 5432
```

**How it fits together:**
- The frontend **never talks to the database directly** — every read and write goes through the FastAPI
  backend over a REST API (plus one WebSocket endpoint for live chat).
- **All business logic and authorization live in the backend.** Role-based access control and
  object-level authorization (e.g. "is this user actually a party to this contract?") are enforced on
  every relevant endpoint server-side — the frontend only hides UI it happens to already correctly not
  have access to, it is never the thing preventing access.
- The **Procurement Intelligence** layer (`app/services/intelligence.py`) computes price forecasts, deal
  scores, supplier scores, and risk scores at request time directly from live database rows — there's no
  caching layer and no external API call to reason about.
- **Alembic** manages schema migrations; the API container runs `alembic upgrade head` automatically on
  startup. Seeding demo data is a **separate, explicit step** (see [How to Run](#8-how-to-run)) — it is
  not run automatically, so an empty marketplace after first boot means the seed step hasn't been run yet,
  not that anything is broken.

---

## 5. Project Structure

```
kisansetu/
├── docker-compose.yml          # Orchestrates db, api, web containers
├── Makefile                    # make up / down / db-reset / test
├── .env.example                # Root-level environment template
├── README.md
│
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py         # App entrypoint, router registration
│   │   │   ├── seed.py         # Full demo-data seed script
│   │   │   ├── core/           # config, security (JWT/bcrypt), authz, deps
│   │   │   ├── db/             # SQLAlchemy engine/session
│   │   │   ├── models/         # SQLAlchemy models (core, catalog, deal, contract, ops)
│   │   │   ├── routers/        # One file per API resource (auth, products, quotes,
│   │   │   │                   #   contracts, lots, quality, payments, deliveries,
│   │   │   │                   #   market, chat, disputes, notifications, admin,
│   │   │   │                   #   intelligence, me)
│   │   │   └── services/       # audit logging, procurement intelligence
│   │   ├── alembic/            # Schema migrations
│   │   ├── tests/               # Pytest suite (critical path, security, intelligence)
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── web/                    # Next.js frontend
│       ├── app/                 # App Router pages — public/, buyer/, seller/, admin/, lots/
│       ├── components/          # Shared UI: navbar, cards, contract views, product image, etc.
│       ├── lib/                 # api client, auth context, product-image mapping
│       ├── public/products/     # Product illustration assets (39 products + fallback)
│       ├── package.json
│       ├── Dockerfile
│       └── .env.local.example
```

---

## 6. Database

- **Technology:** PostgreSQL 16.
- **29 tables**, all UUID-keyed with proper foreign keys, timestamps, and numeric types for money/quantity:
  `users`, `buyer_profiles`, `seller_profiles`, `fpos`, `fpo_members`, `farms`, `products`, `crop_cycles`,
  `product_availability`, `buyer_requirements`, `quotes`, `quote_versions`, `contracts`,
  `contract_versions`, `contract_milestones`, `lots`, `deliveries`, `quality_standards`, `inspections`,
  `inspection_results`, `evidence`, `market_prices`, `chat_threads`, `chat_messages`, `payments`,
  `disputes`, `risk_events`, `notifications`, `audit_logs`.

**Key relationships:**
```
users 1─1 buyer_profiles / seller_profiles
buyer_requirement ──< quotes ──< quote_versions   (full negotiation history, never overwritten)
accepted quote ──> contract ──< contract_milestones
                             ├─< lots ──< inspections ──< inspection_results
                             ├─< deliveries
                             └─< payments
every meaningful action ──> audit_logs (append-only)
```

**Seed data** (`apps/api/app/seed.py`) is realistic and internally consistent: 94 users across every
role, 117 products, ~3,960 market price observations, 108 buyer requirements, 225 quotes with real
multi-round negotiation and chat history, 108 contracts spanning every lifecycle status, 117 lots, 101
quality inspections, 40 deliveries, 453 notifications, and 1,800+ audit log entries. Every relationship is
real — a contract's buyer_id and seller_id are verified via SQL to trace back correctly to the
requirement and quote that produced it, with zero orphaned records (checked directly, not assumed).

**How the database is initialized:** the `api` container runs `alembic upgrade head` automatically on
startup, creating all 29 tables from migration history. This does **not** insert any data.

**How to seed demo data:** a separate, explicit step — see [Database Commands](#10-database-commands)
below. The seed script is a full **drop-and-recreate**: it always leaves the database in the same clean,
fully-populated, internally-consistent state, so it's always safe to rerun and never produces duplicates.

**How to inspect the database directly:**
- CLI: `docker compose exec db psql -U postgres -d kisansetu`
- GUI: any Postgres client (TablePlus, Postico, pgAdmin, DBeaver) — Host `localhost`, Port `5432`, User
  `postgres`, Password `postgres`, Database `kisansetu`

---

## 7. Demo Accounts

Password for **every** account below (and all 94 seeded accounts): `Password123!`

| Role | Email | Password | Purpose |
|---|---|---|---|
| Buyer | `buyer@kisansetu.demo` | `Password123!` | Marketplace/buying — browse products, post requirements, negotiate, manage contracts |
| Seller | `seller@kisansetu.demo` | `Password123!` | Product management — list produce, respond to buyer opportunities, negotiate |
| Admin | `admin@kisansetu.demo` | `Password123!` | Platform administration — Operations Command Center, user/contract/dispute management |
| Quality | `quality@kisansetu.demo` | `Password123!` | Quality verification — record inspections against lots |
| FPO | `fpo@kisansetu.demo` | `Password123!` | FPO management — aggregated farmer-producer-organization selling |

The login page has one-click buttons that autofill each of these. All five were verified working by
direct API call immediately before this build was packaged (see [Project Status](#14-project-status)).

The seed also creates a much larger realistic roster so dashboards feel like an active marketplace: 24
buyers, 42 individual sellers, 10 FPOs, 12 quality officers, and 6 admins in total (`buyer2`–`buyer24`,
`seller2`–`seller42`, `fpo2`–`fpo10`, `quality2`–`quality12`, `admin2`–`admin6`, all `@kisansetu.demo`,
same password).

---

## 8. How to Run

**Prerequisite:** Docker Desktop installed and running.

| Step | Command | Purpose |
|---|---|---|
| 1 | `cp .env.example .env` | Configure environment |
| 2 | `docker compose up --build -d` | Build images and start the database, backend, and frontend containers (detached) |
| 3 | `docker compose ps` | Verify all three services show `Up` |
| 4 | `docker compose exec api python -m app.seed` (or `make db-reset`) | Seed all demo data — migrations already ran automatically in step 2 |
| 5 | Open `http://localhost:3000` | Open the application |
| 6 | Open `http://localhost:8000/docs` | (Optional) explore the interactive API docs |

Step 2 takes a couple of minutes on first run (downloading base images, compiling the frontend). Step 4
takes a few seconds and prints the full demo credential list when done.

**Running without Docker** (needs Python 3.12+, Node 20+, and a local PostgreSQL 16 server):

```bash
# Database
createdb kisansetu
psql -d kisansetu -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Backend
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit DATABASE_URL if your local Postgres user/password differ
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd apps/web
npm install
cp .env.local.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

---

## 9. Environment Variables

Real `.env.example` files are included at the root and in each app — no real secrets are in this
repository. Every variable below is either a safe local-dev default or a placeholder you should replace
before any non-local deployment.

| Variable | Where it's used | Purpose | Example / default |
|---|---|---|---|
| `DATABASE_URL` | Backend | SQLAlchemy connection string | `postgresql+psycopg2://postgres:postgres@localhost:5432/kisansetu` |
| `JWT_SECRET` | Backend | Signs/verifies auth tokens — **change before any real deployment** | `dev-secret-change-me-in-production` |
| `NEXT_PUBLIC_API_URL` | Frontend | Base URL the browser calls for the API. **Baked in at build time**, not read at runtime — see [Troubleshooting](#11-troubleshooting) | `http://localhost:8000` |
| `API_URL` | Frontend (server-side, if used) | Same purpose as above for any server-side calls | `http://localhost:8000` |
| `REDIS_URL` | Not currently used | Reserved for future background-job use | `redis://localhost:6379` |
| `STORAGE_BUCKET` / `STORAGE_ENDPOINT` | Not currently used | Reserved for future real file/evidence upload | — |
| `PAYMENT_PROVIDER` | Not currently used | Reserved — payments are currently a safe simulator, not a real gateway | `simulator` |
| `MARKET_DATA_PROVIDER` | Not currently used | Reserved — market data currently comes entirely from the seed dataset | `seed` |

---

## 10. Database Commands

| Task | Docker | Local (venv active in `apps/api`) |
|---|---|---|
| Start database | `docker compose up -d db` | Start your local Postgres server |
| Run migrations | automatic on `api` container start | `alembic upgrade head` |
| Create a new migration | `docker compose exec api alembic revision --autogenerate -m "..."` | `alembic revision --autogenerate -m "..."` |
| Seed demo data | `docker compose exec api python -m app.seed` or `make db-reset` | `python -m app.seed` |
| Reset everything (wipe volume) | `docker compose down -v && docker compose up --build -d` then reseed | drop and recreate the database, then `alembic upgrade head && python -m app.seed` |
| Inspect via CLI | `docker compose exec db psql -U postgres -d kisansetu` | `psql -d kisansetu` |
| Run backend tests | `docker compose exec api pytest -v` or `make test` | `pytest -v` (point `DATABASE_URL` at a disposable DB first so you don't wipe your demo data) |

---

## 11. Troubleshooting

**Backend container won't start / keeps restarting**
Check its logs: `docker compose logs api --tail=100`. The traceback at the bottom tells you the real
cause — don't guess.

**`could not translate host name "db" to address`**
This is a Docker networking/DNS issue, not an application bug — the `api` container can't resolve the
`db` service name. Almost always fixed by a clean teardown and rebuild:
```bash
docker compose down -v --remove-orphans
docker compose up --build -d
```
If it persists, quit Docker Desktop completely (not just close the window) and reopen it — Docker's
internal DNS resolver occasionally needs a full restart, particularly on macOS.

**`service "api" is not running` when running `make db-reset`**
`docker compose exec` needs a live container. Run `docker compose ps` — if nothing is listed, the stack
was never started (or was stopped). Run `docker compose up --build -d` first, confirm all three services
show `Up`, then retry.

**Demo login fails with "Incorrect email or password"**
The overwhelmingly common cause: the seed step was never run. `docker compose up --build` only runs
**migrations** — it creates empty tables, not demo users. Run:
```bash
docker compose exec api python -m app.seed
```
Verify directly rather than guessing:
```bash
docker compose exec db psql -U postgres -d kisansetu -c "SELECT count(*) FROM users;"
```
If this returns `0`, that confirms it — reseed and try again.

**Products not appearing in the marketplace**
Same root cause as above almost every time — an unseeded database. Confirm with:
```bash
docker compose exec db psql -U postgres -d kisansetu -c "SELECT count(*) FROM products;"
```
If backend logs show `GET /api/v1/products` returning `200 OK` but the count above is `0`, that `200` is
just a successful *empty* response — the endpoint is healthy, the data just isn't there yet. Reseed.

**Frontend loads but can't reach the API / all requests fail**
`NEXT_PUBLIC_API_URL` is compiled into the JavaScript bundle **at build time**, not read at container
runtime. If you change it in `.env` after the first `docker compose up --build`, a plain restart will
*not* pick up the change — you must rebuild:
```bash
docker compose up --build web
```

**Port conflicts (3000, 8000, or 5432 already in use)**
Something else on your machine is already using that port. Either stop it, or change the host-side port
mapping in `docker-compose.yml` (the `ports:` section for the relevant service) and update
`NEXT_PUBLIC_API_URL` to match if you change the API's port.

**Seed script fails partway through**
Run it directly and read the traceback: `docker compose exec api python -m app.seed`. The script is a
full drop-and-recreate, so a failed run doesn't leave partial data behind to worry about — fix the
underlying cause (usually a database connectivity issue) and rerun.

**Missing environment variables**
Both `docker-compose.yml` and the app-level `.env.example` files list every variable actually read by the
code. If you copied `.env.example` to `.env` at the root (step 1 in [How to Run](#8-how-to-run)), you
have everything needed for local Docker use.

---

## 12. Deployment

This repo includes production-style Dockerfiles for both apps (`apps/api/Dockerfile`,
`apps/web/Dockerfile`) and a `docker-compose.yml` that runs all three services together — this is
directly deployable to any single Docker host (a VM, a small cloud instance, etc.) by copying the repo
over, setting real values in `.env` (especially `JWT_SECRET` and `NEXT_PUBLIC_API_URL` — the latter must
point at wherever the API will actually be publicly reachable, since it's baked in at build time), and
running the same `docker compose up --build -d`.

There is no CI/CD pipeline or platform-specific deployment configuration (e.g. Vercel, Render, AWS ECS)
included in this build — see [Future Improvements](#13-future-improvements).

---

## 13. Future Improvements

The items below are genuinely **not implemented** — listed here so it's clear what this build does and
doesn't include, rather than leaving it ambiguous.

- **Real product photography.** This environment had no photorealistic image-generation tool available,
  so product imagery is a custom-built, consistent *illustrated icon* set (SVG), not photographs. The
  image system is fully data-driven (`lib/product-images.ts`), so swapping in real photos later is a
  filename-mapping change, not a refactor.
- PostGIS-based geospatial farm mapping (farm location is currently plain lat/lng columns)
- Redis-backed background jobs / caching
- A real payment gateway integration (payments are currently a safe, clearly-labeled simulator)
- Real file/evidence upload with object storage (currently accepts a URL string)
- A browser-driven (Playwright) end-to-end test suite, to complement the current API-level pytest suite
- Production secrets management (the current `.env.example` values are safe local-dev defaults, not
  something to reuse verbatim in production)
- Query optimization for a couple of endpoints (`/products`, supplier scoring) that do a small N+1 query
  pattern — invisible at current demo data volume, worth addressing before scaling far beyond it
- CI/CD pipeline and a platform-specific deployment target

---

## 14. Project Status

**KISANSETU v6 — Final Hackathon Build**

Verified immediately before packaging: backend health check, all 8 backend tests, a full seed run from a
clean database, all 5 primary demo account logins, live product visibility (117 products across 39
distinct crops, each with a mapped image), and a clean production frontend build. See the delivery
message accompanying this README for the complete build-status checklist.
