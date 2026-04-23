import subprocess
import uuid
import os
from typing import List
from ..models.schemas import FirewallRule, PortForward
from .logger import log
from .state import state
from ..services.auth import settings

HOSTAPD_CONF = "/etc/hostapd/hostapd.conf"
HOSTAPD_DEFAULT = "/etc/default/hostapd"
WG_CONF_DIR = "/etc/wireguard"
STATE_DIR = "/var/lib/router-api"

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
        log("error", "firewall", f"Command failed: {' '.join(args)} - {e}")
        return ""

def _set_permissions(path: str, mode: int = 0o600) -> bool:
    try:
        os.chmod(path, mode)
        return True
    except Exception as e:
        log("error", "firewall", f"Failed to set permissions on {path}: {e}")
        return False

def _apply_iptables_rule(rule: FirewallRule, add: bool = True) -> bool:
    action = "-A" if add else "-D"
    protocol = rule.protocol.lower()
    
    args = ["iptables", action, "INPUT", "-p", protocol, "--dport", str(rule.port)]
    
    if rule.source_ip:
        args.extend(["-s", rule.source_ip])
    
    if rule.action in ("allow", "accept"):
        args.append("-j ACCEPT")
    else:
        args.append("-j DROP")
    
    result = _run(args)
    return result == ""

def _save_iptables() -> bool:
    result = _run(["iptables-save"])
    if result:
        try:
            with open("/etc/iptables/rules.v4", "w") as f:
                f.write(result)
            _set_permissions("/etc/iptables/rules.v4", 0o600)
            return True
        except Exception as e:
            log("error", "firewall", f"Failed to save iptables: {e}")
            return False
    return False

def get_firewall_rules() -> List[FirewallRule]:
    return state.firewall

def add_firewall_rule(rule: FirewallRule) -> bool:
    if not rule.id:
        rule.id = str(uuid.uuid4())[:8]
    
    state.add_firewall_rule(rule)
    
    if rule.enabled:
        if _apply_iptables_rule(rule, True):
            _save_iptables()
            return True
    
    return True

def delete_firewall_rule(rule_id: str) -> bool:
    for rule in state.firewall:
        if rule.id == rule_id:
            _apply_iptables_rule(rule, False)
            break
    
    state.delete_firewall_rule(rule_id)
    _save_iptables()
    return True

def _apply_port_forward(forward: PortForward, add: bool = True) -> bool:
    action = "-A" if add else "-D"
    protocol = forward.protocol.lower()
    
    args = [
        "iptables", "-t", "nat", action, "PREROUTING",
        "-p", protocol, "--dport", str(forward.external_port),
        "-j", "DNAT", "--to-destination",
        f"{forward.internal_ip}:{forward.internal_port}"
    ]
    
    result = _run(args)
    return result == ""

def get_port_forwards() -> List[PortForward]:
    return state.port_forwards

def add_port_forward(forward: PortForward) -> bool:
    if not forward.id:
        forward.id = str(uuid.uuid4())[:8]
    
    state.add_port_forward(forward)
    
    if forward.enabled:
        if _apply_port_forward(forward, True):
            _save_iptables()
            return True
    
    return True

def delete_port_forward(forward_id: str) -> bool:
    for forward in state.port_forwards:
        if forward.id == forward_id:
            _apply_port_forward(forward, False)
            break
    
    state.delete_port_forward(forward_id)
    _save_iptables()
    return True

def apply_firewall_rules() -> bool:
    result = _run(["iptables-restore", "/etc/iptables/rules.v4"])
    return result == ""

def init_firewall():
    _run(["iptables", "-A", "INPUT", "-m", "state", "--state", "ESTABLISHED,RELATED", "-j", "ACCEPT"])
    _run(["iptables", "-A", "INPUT", "-i", "lo", "-j", "ACCEPT"])
    _run(["iptables", "-A", "INPUT", "-p", "icmp", "-j", "ACCEPT"])
    log("info", "firewall", "Firewall initialized")