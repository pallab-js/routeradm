from pathlib import Path
from typing import Optional
from ..models.schemas import GuestNetwork
from .logger import log
from .state import state
from ..services.auth import settings
from .utils import run, sanitize_hostapd_value

GUEST_APD_CONF = Path("/etc/hostapd/hostapd-guest.conf")


def _write_guest_config(guest: GuestNetwork) -> bool:
    try:
        ssid = sanitize_hostapd_value(guest.ssid, "ssid")
        password = sanitize_hostapd_value(guest.password, "wpa_passphrase")
        country = state.get_setting("wifi_country_code") or getattr(settings, 'wifi_country_code', 'US')
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
country_code={country}
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

    # Stop any existing guest hostapd first
    run(["pkill", "-f", "hostapd-guest"], log_source="guest")

    result = run(["hostapd", "-B", str(GUEST_APD_CONF)], log_source="guest")
    log("info", "guest", f"Guest network started: {state.guest.ssid}")
    return True


def stop_guest_network() -> bool:
    run(["pkill", "-f", "hostapd-guest"], log_source="guest")
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
    result = run(["pgrep", "-f", "hostapd-guest"], log_source="guest")
    return result != ""
