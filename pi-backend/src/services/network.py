import subprocess
import re
import time
import shutil
from typing import List, Optional, Dict
from ..models.schemas import RouterStatus, NetworkStats, ClientDevice
from .logger import log
from .state import state
from ..services.auth import settings

def _run(args: list[str]) -> str:
    """Run a command as a list of arguments (no shell=True)."""
    try:
        result = subprocess.run(
            args,
            shell=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.stdout.strip()
    except Exception as e:
        log("error", "network", f"Command failed: {' '.join(args)} - {e}")
        return ""

def get_wan_ip() -> Optional[str]:
    result = _run(["ip", "route", "get", "1.1.1.1"])
    for part in result.split():
        if part not in ("via", "dev", "src", "uid") and "." in part:
            try:
                import ipaddress
                ipaddress.IPv4Address(part)
                return part
            except Exception:
                continue
    return _run(["hostname", "-I"]).split(" ")[0] or None

def get_wifi_ssid() -> str:
    ssid = _run(["iwgetid", "-r"])
    return ssid if ssid else (state.wifi.ssid if state.wifi else "")

def get_wifi_signal() -> int:
    result = _run(["iwconfig", settings.wifi_interface])
    m = re.search(r"Signal level=(-\d+)", result)
    try:
        return int(m.group(1)) if m else -50
    except Exception:
        return -50

def get_hostapd_status() -> bool:
    result = _run(["pgrep", "-f", "hostapd"])
    return result != ""

def get_uptime() -> int:
    try:
        with open("/proc/uptime") as f:
            return int(float(f.read().split()[0]))
    except Exception:
        return 0

def get_network_stats() -> NetworkStats:
    rx_bytes = 0
    tx_bytes = 0
    rx_rate = 0
    tx_rate = 0
    
    try:
        with open("/proc/net/dev", "r") as f:
            for line in f:
                if settings.wan_interface in line:
                    parts = line.split()
                    rx_bytes = int(parts[1])
                    tx_bytes = int(parts[9])
    except:
        pass
    
    return NetworkStats(
        rx_bytes=rx_bytes,
        tx_bytes=tx_bytes,
        rx_rate=rx_rate,
        tx_rate=tx_rate,
        wan_uptime=get_uptime(),
        cpu_usage=get_cpu_usage(),
        memory_usage=get_memory_usage()
    )

def get_cpu_usage() -> float:
    try:
        result = _run("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'")
        return float(result) if result else 0.0
    except:
        return 0.0

def get_memory_usage() -> float:
    try:
        result = _run("free | grep Mem | awk '{printf \"%.1f\", ($3/$2) * 100}'")
        return float(result) if result else 0.0
    except:
        return 0.0

def get_router_status() -> RouterStatus:
    return RouterStatus(
        wan_ip=get_wan_ip(),
        clients=len(get_connected_clients()),
        vpn_active=state.vpn.enabled if state.vpn else False,
        ap_ssid=get_wifi_ssid(),
        signal_rssi=get_wifi_signal()
    )

def get_connected_clients() -> List[ClientDevice]:
    clients = []
    current_time = int(time.time())
    
    arp_output = _run(["arp", "-n", "-i", settings.wifi_interface])
    if not arp_output:
        return clients
    
    for line in arp_output.split("\n"):
        if "ether" in line.lower():
            parts = line.split()
            if len(parts) >= 3:
                ip = parts[0]
                mac = parts[2].lower()
                if ip == "(incomplete)":
                    continue
                blocked = state.is_blocked(mac)
                clients.append(ClientDevice(
                    mac=mac,
                    ip=ip,
                    hostname=None,
                    name=state._clients.get(mac, {}).get("name"),
                    connected_at=current_time - 300,
                    rx_bytes=0,
                    tx_bytes=0,
                    blocked=blocked
                ))
    
    return clients