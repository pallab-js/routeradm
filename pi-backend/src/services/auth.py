from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic_settings import BaseSettings
import secrets
import os

class Settings(BaseSettings):
    secret_token: str = ""
    admin_password: str = ""
    api_host: str = "0.0.0.0"
    api_port: int = 8080
    log_level: str = "INFO"
    wifi_interface: str = "wlan0"
    wan_interface: str = "eth0"
    allow_http: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.secret_token:
            raise ValueError("SECRET_TOKEN environment variable is required")
        if not self.admin_password:
            raise ValueError("ADMIN_PASSWORD environment variable is required")
        token_path = "/var/lib/router-api/.token_seed"
        if os.path.exists(token_path):
            seed = open(token_path).read().strip()
            if len(seed) < 32:
                raise ValueError(
                    f"Token seed file {token_path} must contain at least 32 characters"
                )
            self.secret_token = seed

settings = Settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_token, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_token, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def authenticate_admin(plain_password: str) -> bool:
    """Verify plain_password against the stored bcrypt hash in ADMIN_PASSWORD."""
    if not settings.admin_password:
        return False
    return pwd_context.verify(plain_password, settings.admin_password)

def get_initial_token() -> str:
    return settings.secret_token