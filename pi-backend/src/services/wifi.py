import subprocess
import os
import uuid
import re
from pathlib import Path
from typing import Optional, List
from ..models.schemas import WifiSettings
from .logger import log
from .state import state
from ..services.auth import settings

HOSTAPD_CONF = "/etc/hostapd/hostapd.conf"
HOSTAPD_DEFAULT = "/etc/default/hostapd"

_SAFE_HOSTAPD_VALUE = re.compile(r'^[^\n\r\x00]+$')

def _sanitize_hostapd_value(value: str, field: str) -> str:
    if not _SAFE_HOSTAPD_VALUE.match(value):
        raise ValueError(f"hostapd config field '{field}' contains illegal characters")
    return value

def _run(args: List[str]) -> str:
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=30,
            check=False
        )
        return result.stdout.strip()
    except Exception as e:
        log("error", "wifi", f"Command failed: {' '.join(args)} - {e}")
        return ""

def _set_permissions(path: str, mode: int = 0o600) -> bool:
    try:
        os.chmod(path, mode)
        return True
    except Exception as e:
        log("error", "wifi", f"Failed to set permissions on {path}: {e}")
        return False

def _write_hostapd_config(wifi: WifiSettings) -> bool:
    try:
        ssid = _sanitize_hostapd_value(wifi.ssid, "ssid")
        password = _sanitize_hostapd_value(wifi.password, "wpa_passphrase")
        config = f"""interface={settings.wifi_interface}
driver=nl80211
ssid={ssid}
hw_mode=g
channel={wifi.channel}
wpa=2
wpa_passphrase={password}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
country_code=US
"""
        os.makedirs("/etc/hostapd", exist_ok=True)
        os.makedirs("/etc/default", exist_ok=True)
        
        with open(HOSTAPD_CONF, "w") as f:
            f.write(config)
        _set_permissions(HOSTAPD_CONF, 0o600)
        
        with open(HOSTAPD_DEFAULT, "w") as f:
            f.write(f"DAEMON_CONF={HOSTAPD_CONF}\n")
        
        log("info", "wifi", f"hostapd config written: {wifi.ssid}")
        return True
    except ValueError as e:
        log("error", "wifi", str(e))
        return False
    except Exception as e:
        log("error", "wifi", f"Failed to write hostapd config: {e}")
        return False

def start_ap() -> bool:
    if not state.wifi:
        log("warn", "wifi", "No WiFi settings configured")
        return False
    
    if not _write_hostapd_config(state.wifi):
        return False
    
    _run(["systemctl", "stop", "hostapd"])
    
    result = _run(["systemctl", "start", "hostapd"])
    
    if result == "":
        log("info", "wifi", "hostapd started")
        return True
    else:
        log("error", "wifi", f"Failed to start hostapd: {result}")
        return False

def stop_ap() -> bool:
    result = _run(["systemctl", "stop", "hostapd"])
    log("info", "wifi", "hostapd stopped")
    return True

def restart_ap() -> bool:
    stop_ap()
    return start_ap()

def get_wifi_config() -> Optional[WifiSettings]:
    if state.wifi:
        return state.wifi
    return None

def save_wifi_config(wifi: WifiSettings) -> bool:
    state.wifi = wifi
    
    if wifi.enabled:
        return restart_ap()
    else:
        return stop_ap()
    
def is_ap_active() -> bool:
    result = _run(["pgrep", "-f", "hostapd"])
    return result != ""