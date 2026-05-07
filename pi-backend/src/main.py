import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .routers import api
from .services.auth import settings
from .services.logger import log
from .services.limiter import limiter
from .services import firewall


@asynccontextmanager
async def lifespan(app: FastAPI):
    log("info", "api", f"Travel Router API starting on {settings.api_host}:{settings.api_port}")
    log("info", "api", f"WiFi country code: {settings.wifi_country_code}")
    firewall.init_firewall()
    yield
    log("info", "api", "Travel Router API shutting down")


app = FastAPI(
    title="Travel Router API",
    description="REST API for managing Raspberry Pi travel router",
    version="2.0.0",
    lifespan=lifespan,
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


@app.get("/")
async def root():
    return {"service": "Travel Router API", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
