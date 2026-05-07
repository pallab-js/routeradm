import os
from pathlib import Path
from typing import Optional
from ..models.schemas import WifiSettings
from .logger import log
from .state import state
from ..services.auth import settings
from .utils import run, set_permissions
from ._validation import sanitize_hostapd_value

HOSTAPD_CONF = "/etc/hostapd/hostapd.conf"
HOSTAPD_DEFAULT = "/etc/default/hostapd"


def _write_hostapd_config(wifi: WifiSettings) -> bool:
    try:
        ssid = sanitize_hostapd_value(wifi.ssid, "ssid")
        password = sanitize_hostapd_value(wifi.password, "wpa_passphrase")
        country = state.get_setting("wifi_country_code") or getattr(settings, 'wifi_country_code', 'US')
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
country_code={country}
"""
        os.makedirs("/etc/hostapd", exist_ok=True)
        os.makedirs("/etc/default", exist_ok=True)

        with open(HOSTAPD_CONF, "w") as f:
            f.write(config)
        set_permissions(HOSTAPD_CONF, 0o600, "wifi")

        with open(HOSTAPD_DEFAULT, "w") as f:
            f.write(f"DAEMON_CONF={HOSTAPD_CONF}\n")

        log("info", "wifi", f"hostapd config written: {wifi.ssid}")
        return True
    except Exception as e:
        log("error", "wifi", f"Failed to write hostapd config: {e}")
        return False


def start_ap() -> bool:
    if not state.wifi:
        log("warn", "wifi", "No WiFi settings configured")
        return False

    if not _write_hostapd_config(state.wifi):
        return False

    run(["systemctl", "stop", "hostapd"], log_source="wifi")
    result = run(["systemctl", "start", "hostapd"], log_source="wifi")
    # systemctl returns empty stdout on success
    log("info", "wifi", "hostapd started")
    return True


def stop_ap() -> bool:
    run(["systemctl", "stop", "hostapd"], log_source="wifi")
    log("info", "wifi", "hostapd stopped")
    return True


def restart_ap() -> bool:
    stop_ap()
    return start_ap()


def get_wifi_config() -> Optional[WifiSettings]:
    return state.wifi


def save_wifi_config(wifi: WifiSettings) -> bool:
    state.wifi = wifi
    if wifi.enabled:
        return restart_ap()
    else:
        return stop_ap()


def is_ap_active() -> bool:
    result = run(["pgrep", "-f", "hostapd"], log_source="wifi")
    return result != ""
