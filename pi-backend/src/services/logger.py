import logging
import sys
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from collections import deque
from ..models.schemas import RouterLog

_LOG_DIR = Path(os.environ.get("ROUTER_LOG_DIR", "/var/log"))
LOG_FILE = _LOG_DIR / "router-api.log"
AUDIT_FILE = _LOG_DIR / "router-api-audit.log"

def _ensure_log_dir(path: Path) -> bool:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        return True
    except PermissionError:
        return False

def _make_file_handler(path: Path) -> Optional[logging.Handler]:
    try:
        return logging.FileHandler(path)
    except (PermissionError, OSError):
        return None

if not _ensure_log_dir(LOG_FILE):
    _LOG_DIR = Path(tempfile.gettempdir()) / "router-api"
    LOG_FILE = _LOG_DIR / "router-api.log"
    AUDIT_FILE = _LOG_DIR / "router-api-audit.log"
    _ensure_log_dir(LOG_FILE)

handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
file_handler = _make_file_handler(LOG_FILE)
if file_handler:
    handlers.append(file_handler)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=handlers,
)

logger = logging.getLogger("router-api")
audit_logger = logging.getLogger("router-api-audit")
audit_handler = _make_file_handler(AUDIT_FILE)
if audit_handler:
    audit_handler.setFormatter(logging.Formatter("%(asctime)s - AUDIT - %(message)s"))
    audit_logger.addHandler(audit_handler)
audit_logger.setLevel(logging.INFO)

_logs: deque = deque(maxlen=1000)
MAX_LOGS = 1000

def log(level: str, source: str, message: str):
    entry = RouterLog(
        timestamp=int(datetime.now().timestamp()),
        level=level.upper(),
        source=source,
        message=message
    )
    _logs.append(entry)
    method = "warning" if level.lower() == "warn" else level.lower()
    getattr(logger, method, logger.info)(f"[{source}] {message}")

def audit(action: str, details: dict, ip: Optional[str] = None, token_prefix: Optional[str] = None):
    audit_entry = {
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "ip": ip or "unknown",
        "token": token_prefix or "none",
        **details
    }
    audit_logger.info(str(audit_entry))

def audit_auth_attempt(success: bool, ip: Optional[str] = None):
    audit("AUTH_ATTEMPT", {"success": success}, ip)

def audit_config_change(action: str, component: str, details: dict, ip: Optional[str] = None):
    audit("CONFIG_CHANGE", {"action": action, "component": component, **details}, ip)

def audit_rate_limit(ip: str, endpoint: str):
    audit("RATE_LIMIT_EXCEEDED", {"endpoint": endpoint}, ip)

def get_logs(limit: int = 100) -> List[RouterLog]:
    items = list(_logs)
    return items[-limit:]
