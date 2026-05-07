import uuid
import os
from typing import List
from ..models.schemas import FirewallRule, PortForward
from .logger import log
from .state import state
from .utils import run, set_permissions


def _apply_iptables_rule(rule: FirewallRule, add: bool = True) -> bool:
    action = "-A" if add else "-D"
    protocol = rule.protocol.lower()

    args = ["iptables", action, "INPUT", "-p", protocol, "--dport", str(rule.port)]

    if rule.source_ip:
        args.extend(["-s", rule.source_ip])

    if rule.action in ("allow", "accept"):
        args.extend(["-j", "ACCEPT"])
    else:
        args.extend(["-j", "DROP"])

    result = run(args, log_source="firewall")
    return True


def _save_iptables() -> bool:
    result = run(["iptables-save"], log_source="firewall")
    if result:
        try:
            with open("/etc/iptables/rules.v4", "w") as f:
                f.write(result)
            set_permissions("/etc/iptables/rules.v4", 0o600, "firewall")
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

    if rule.enabled:
        if not _apply_iptables_rule(rule, True):
            log("error", "firewall", f"iptables rejected rule port={rule.port}")
            return False
        _save_iptables()

    state.add_firewall_rule(rule)
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
    result = run(args, log_source="firewall")
    return True


def get_port_forwards() -> List[PortForward]:
    return state.port_forwards


def add_port_forward(forward: PortForward) -> bool:
    if not forward.id:
        forward.id = str(uuid.uuid4())[:8]
    state.add_port_forward(forward)
    if forward.enabled:
        _apply_port_forward(forward, True)
        _save_iptables()
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
    result = run(["iptables-restore", "/etc/iptables/rules.v4"], log_source="firewall")
    return True


def init_firewall():
    run(["iptables", "-F", "INPUT"], log_source="firewall")
    run(["iptables", "-A", "INPUT", "-m", "state", "--state", "ESTABLISHED,RELATED", "-j", "ACCEPT"], log_source="firewall")
    run(["iptables", "-A", "INPUT", "-i", "lo", "-j", "ACCEPT"], log_source="firewall")
    run(["iptables", "-A", "INPUT", "-p", "icmp", "-j", "ACCEPT"], log_source="firewall")
    for rule in state.firewall:
        if rule.enabled:
            _apply_iptables_rule(rule, True)
    log("info", "firewall", "Firewall initialised")
