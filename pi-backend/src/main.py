import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .routers import api
from .services.auth import settings
from .services.logger import log, log_info
from .services import firewall

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Travel Router API",
    description="REST API for managing Raspberry Pi travel router",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",") if os.environ.get("ALLOWED_ORIGINS") else ["http://localhost:3000", "travel-router-admin://"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api.router, prefix="/api", tags=["router"])

@app.on_event("startup")
async def startup_event():
    log("info", "api", f"Travel Router API starting on {settings.api_host}:{settings.api_port}")
    firewall.init_firewall()

@app.on_event("shutdown")
async def shutdown_event():
    log("info", "api", "Travel Router API shutting down")

@app.get("/")
async def root():
    return {"service": "Travel Router API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)