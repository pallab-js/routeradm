import subprocess
import os
import uuid
from pathlib import Path
from typing import Optional, List
from ..models.schemas import VpnSettings
from .logger import log
from .state import state
from ..services.auth import settings

WG_CONF_DIR = "/etc/wireguard"
OVPN_CONF_DIR = "/etc/openvpn"

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
        log("error", "vpn", f"Command failed: {' '.join(args)} - {e}")
        return ""

def _set_permissions(path: str, mode: int = 0o600) -> bool:
    try:
        os.chmod(path, mode)
        return True
    except Exception as e:
        log("error", "vpn", f"Failed to set permissions on {path}: {e}")
        return False

def _write_wireguard_config(config: str) -> bool:
    try:
        os.makedirs(WG_CONF_DIR, exist_ok=True)
        wg_conf = f"{WG_CONF_DIR}/wg0.conf"
        with open(wg_conf, "w") as f:
            f.write(config)
        _set_permissions(wg_conf, 0o600)
        log("info", "vpn", "WireGuard config written")
        return True
    except Exception as e:
        log("error", "vpn", f"Failed to write WireGuard config: {e}")
        return False

def start_wireguard() -> bool:
    result = _run(["wg-quick", "up", "wg0"])
    if result == "":
        log("info", "vpn", "WireGuard started")
        return True
    else:
        log("error", "vpn", f"Failed to start WireGuard: {result}")
        return False

def stop_wireguard() -> bool:
    result = _run(["wg-quick", "down", "wg0"])
    log("info", "vpn", "WireGuard stopped")
    return True

def start_openvpn(config: str, name: str = "travel-router") -> bool:
    try:
        os.makedirs(OVPN_CONF_DIR, exist_ok=True)
        ovpn_conf = f"{OVPN_CONF_DIR}/{name}.conf"
        with open(ovpn_conf, "w") as f:
            f.write(config)
        _set_permissions(ovpn_conf, 0o600)
        
        result = _run(["systemctl", "start", f"openvpn@{name}"])
        if result == "":
            log("info", "vpn", f"OpenVPN started: {name}")
            return True
        else:
            log("error", "vpn", f"Failed to start OpenVPN: {result}")
            return False
    except Exception as e:
        log("error", "vpn", f"Failed to start OpenVPN: {e}")
        return False

def stop_openvpn(name: str = "travel-router") -> bool:
    result = _run(["systemctl", "stop", f"openvpn@{name}"])
    log("info", "vpn", f"OpenVPN stopped: {name}")
    return True

def start_vpn(provider: str, config: str) -> bool:
    if provider.lower() == "wireguard":
        if _write_wireguard_config(config):
            return start_wireguard()
        return False
    elif provider.lower() == "openvpn":
        return start_openvpn(config)
    else:
        log("warn", "vpn", f"Unknown VPN provider: {provider}")
        return False

def stop_vpn(provider: str) -> bool:
    if provider.lower() == "wireguard":
        return stop_wireguard()
    elif provider.lower() == "openvpn":
        return stop_openvpn()
    else:
        log("warn", "vpn", f"Unknown VPN provider: {provider}")
        return False

def get_vpn_status() -> bool:
    result = _run(["ip", "link", "show", "wg0"])
    return bool(result)

def save_vpn_config(vpn: VpnSettings) -> bool:
    if vpn.config:
        state.vpn = vpn
        
        if vpn.enabled:
            return start_vpn(vpn.provider, vpn.config)
        else:
            return stop_vpn(vpn.provider)
    return False

def get_vpn_config() -> Optional[VpnSettings]:
    vpn = state.vpn
    if vpn:
        return VpnSettings(
            provider=vpn.provider,
            config="",
            enabled=get_vpn_status()
        )
    return None