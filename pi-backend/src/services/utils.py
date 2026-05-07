import subprocess
import os
from typing import List, Optional
from .logger import log
from ._validation import validate_mac, validate_ip, sanitize_hostapd_value  # noqa: F401


def run(args: List[str], timeout: int = 30, log_source: str = "system") -> str:
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if result.returncode != 0:
            log("warn", log_source,
                f"Command non-zero exit: {' '.join(args)} - {result.stderr.strip()}")
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        log("error", log_source, f"Command timed out: {' '.join(args)}")
        return ""
    except Exception as e:
        log("error", log_source, f"Command failed: {' '.join(args)} - {e}")
        return ""


def run_shell(command: str, timeout: int = 30, log_source: str = "system") -> str:
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        log("error", log_source, f"Shell command timed out: {command}")
        return ""
    except Exception as e:
        log("error", log_source, f"Shell command failed: {command} - {e}")
        return ""


def set_permissions(path: str, mode: int = 0o600, log_source: str = "system") -> bool:
    try:
        os.chmod(path, mode)
        return True
    except Exception as e:
        log("error", log_source, f"Failed to set permissions on {path}: {e}")
        return False
