import re
import time
from typing import List, Optional
from ..models.schemas import RouterStatus, NetworkStats, ClientDevice
from .logger import log
from .state import state
from ..services.auth import settings
from .utils import run, run_shell


def get_wan_ip() -> Optional[str]:
    result = run(["ip", "route", "get", "1.1.1.1"], log_source="network")
    for part in result.split():
        if part not in ("via", "dev", "src", "uid") and "." in part:
            try:
                import ipaddress
                ipaddress.IPv4Address(part)
                return part
            except Exception:
                continue
    return run(["hostname", "-I"], log_source="network").split(" ")[0] or None


def get_wifi_ssid() -> str:
    ssid = run(["iwgetid", "-r"], log_source="network")
    return ssid if ssid else (state.wifi.ssid if state.wifi else "")


def get_wifi_signal() -> int:
    result = run(["iwconfig", settings.wifi_interface], log_source="network")
    m = re.search(r"Signal level=(-\d+)", result)
    try:
        return int(m.group(1)) if m else -50
    except Exception:
        return -50


def get_hostapd_status() -> bool:
    result = run(["pgrep", "-f", "hostapd"], log_source="network")
    return result != ""


def get_uptime() -> int:
    try:
        with open("/proc/uptime") as f:
            return int(float(f.read().split()[0]))
    except Exception:
        return 0


_prev_rx: int = 0
_prev_tx: int = 0
_prev_time: float = 0.0


def get_network_stats() -> NetworkStats:
    global _prev_rx, _prev_tx, _prev_time
    rx_bytes = 0
    tx_bytes = 0

    try:
        with open("/proc/net/dev", "r") as f:
            for line in f:
                if settings.wan_interface in line:
                    parts = line.split()
                    rx_bytes = int(parts[1])
                    tx_bytes = int(parts[9])
    except Exception:
        pass

    now = time.time()
    delta = now - _prev_time if _prev_time > 0 else 1
    rx_rate = int((rx_bytes - _prev_rx) / delta) if _prev_rx > 0 else 0
    tx_rate = int((tx_bytes - _prev_tx) / delta) if _prev_tx > 0 else 0
    _prev_rx, _prev_tx, _prev_time = rx_bytes, tx_bytes, now

    return NetworkStats(
        rx_bytes=rx_bytes,
        tx_bytes=tx_bytes,
        rx_rate=max(rx_rate, 0),
        tx_rate=max(tx_rate, 0),
        wan_uptime=get_uptime(),
        cpu_usage=get_cpu_usage(),
        memory_usage=get_memory_usage()
    )


def get_cpu_usage() -> float:
    result = run_shell(
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'",
        log_source="network"
    )
    try:
        return float(result) if result else 0.0
    except Exception:
        return 0.0


def get_memory_usage() -> float:
    result = run_shell(
        "free | grep Mem | awk '{printf \"%.1f\", ($3/$2) * 100}'",
        log_source="network"
    )
    try:
        return float(result) if result else 0.0
    except Exception:
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

    arp_output = run(["arp", "-n", "-i", settings.wifi_interface], log_source="network")
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
                    name=state.get_client_name(mac),
                    connected_at=current_time - 300,
                    rx_bytes=0,
                    tx_bytes=0,
                    blocked=blocked
                ))

    return clients
