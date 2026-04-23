import subprocess
import re
from pathlib import Path
from typing import Optional
from ..models.schemas import GuestNetwork
from .logger import log
from .state import state

GUEST_APD_CONF = Path("/etc/hostapd/hostapd-guest.conf")

_SAFE_HOSTAPD_VALUE = re.compile(r'^[^\n\r\x00]+$')

def _sanitize_hostapd_value(value: str, field: str) -> str:
    if not _SAFE_HOSTAPD_VALUE.match(value):
        raise ValueError(f"hostapd config field '{field}' contains illegal characters")
    return value

def _run(args: list[str]) -> str:
    try:
        result = subprocess.run(
            args, shell=False, capture_output=True, text=True, timeout=30
        )
        return result.stdout.strip()
    except Exception as e:
        log("error", "guest", f"Command failed: {' '.join(args)} - {e}")
        return ""

def _write_guest_config(guest: GuestNetwork) -> bool:
    try:
        ssid = _sanitize_hostapd_value(guest.ssid, "ssid")
        password = _sanitize_hostapd_value(guest.password, "wpa_passphrase")
        config = f"""interface=wlan1
driver=nl80211
ssid={ssid}
hw_mode=g
channel={guest.channel}
wpa=2
wpa_passphrase={password}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
country_code=US
max_num_sta={guest.max_clients}
"""
        GUEST_APD_CONF.parent.mkdir(parents=True, exist_ok=True)
        GUEST_APD_CONF.write_text(config)
        
        log("info", "guest", f"Guest WiFi config written: {guest.ssid}")
        return True
    except Exception as e:
        log("error", "guest", f"Failed to write guest config: {e}")
        return False

def start_guest_network() -> bool:
    if not state.guest or not state.guest.enabled:
        log("warn", "guest", "Guest network not configured or disabled")
        return False
    
    if not _write_guest_config(state.guest):
        return False
    
    result = _run(["hostapd", "-B", str(GUEST_APD_CONF)])
    
    if result == "":
        log("info", "guest", f"Guest network started: {state.guest.ssid}")
        return True
    else:
        log("error", "guest", f"Failed to start guest network: {result}")
        return False

def stop_guest_network() -> bool:
    _run(["pkill", "-f", "hostapd-guest"])
    log("info", "guest", "Guest network stopped")
    return True

def restart_guest_network() -> bool:
    stop_guest_network()
    return start_guest_network()

def get_guest_network() -> Optional[GuestNetwork]:
    return state.guest

def save_guest_network(guest: GuestNetwork) -> bool:
    state.guest = guest
    
    if guest.enabled:
        return restart_guest_network()
    else:
        return stop_guest_network()

def is_guest_active() -> bool:
    result = _run("pgrep -f hostapd-guest")
    return result != ""