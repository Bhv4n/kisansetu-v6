from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import auth, me, products, requirements, quotes, contracts, lots, quality, payments, market, chat, disputes, notifications, admin, intelligence, deliveries

app = FastAPI(title="KISANSETU API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": str(exc)})


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


for r in (auth, me, products, requirements, quotes, contracts, lots, quality, payments, market, chat, disputes, notifications, admin, intelligence, deliveries):
    app.include_router(r.router)
