import subprocess
import re
import json
import os
from pathlib import Path
from typing import List, Optional, Dict
from ..models.schemas import (
    WifiSettings, VpnSettings, GuestNetwork, 
    FirewallRule, PortForward
)
from .logger import log

STATE_DIR = Path("/var/lib/router-api")
STATE_FILE = STATE_DIR / "state.json"
STATE_DIR.mkdir(parents=True, exist_ok=True)
os.chmod(str(STATE_DIR), 0o750)

class StateManager:
    def __init__(self):
        self._wifi: Optional[WifiSettings] = None
        self._vpn: Optional[VpnSettings] = None
        self._guest: Optional[GuestNetwork] = None
        self._firewall: List[FirewallRule] = []
        self._port_forwards: List[PortForward] = []
        self._clients: Dict[str, dict] = {}
        self._blocked_macs: set = set()
        self._load()
    
    def _load(self):
        if STATE_FILE.exists():
            try:
                data = json.loads(STATE_FILE.read_text())
                self._wifi = WifiSettings(**data.get("wifi", {})) if data.get("wifi") else None
                self._vpn = VpnSettings(**data.get("vpn", {})) if data.get("vpn") else None
                self._guest = GuestNetwork(**data.get("guest", {})) if data.get("guest") else None
                self._firewall = [FirewallRule(**r) for r in data.get("firewall", [])]
                self._port_forwards = [PortForward(**p) for p in data.get("port_forwards", [])]
                self._blocked_macs = set(data.get("blocked_macs", []))
                self._clients = {
                    mac: {"name": name}
                    for mac, name in data.get("client_names", {}).items()
                }
            except Exception as e:
                log("warn", "state", f"Failed to load state: {e}")
    
    def _save(self):
        try:
            wifi_data = None
            if self._wifi:
                wifi_data = self._wifi.model_dump()
                wifi_data["password"] = ""

            guest_data = None
            if self._guest:
                guest_data = self._guest.model_dump()
                guest_data["password"] = ""

            vpn_data = None
            if self._vpn:
                vpn_data = {
                    "provider": self._vpn.provider,
                    "enabled": self._vpn.enabled,
                    "config": "",
                }

            data = {
                "wifi": wifi_data,
                "vpn": vpn_data,
                "guest": guest_data,
                "firewall": [r.model_dump() for r in self._firewall],
                "port_forwards": [p.model_dump() for p in self._port_forwards],
                "blocked_macs": list(self._blocked_macs),
                "client_names": {mac: d.get("name", "") for mac, d in self._clients.items()},
            }
            STATE_FILE.write_text(json.dumps(data, indent=2))
            os.chmod(str(STATE_FILE), 0o600)
        except Exception as e:
            log("error", "state", f"Failed to save state: {e}")
    
    @property
    def wifi(self) -> Optional[WifiSettings]:
        return self._wifi
    
    @wifi.setter
    def wifi(self, value: WifiSettings):
        self._wifi = value
        self._save()
        log("info", "wifi", f"WiFi settings updated: ssid={value.ssid}")
    
    @property
    def vpn(self) -> Optional[VpnSettings]:
        return self._vpn
    
    @vpn.setter
    def vpn(self, value: VpnSettings):
        self._vpn = value
        self._save()
        log("info", "vpn", f"VPN settings updated: provider={value.provider}")
    
    @property
    def guest(self) -> Optional[GuestNetwork]:
        return self._guest
    
    @guest.setter
    def guest(self, value: GuestNetwork):
        self._guest = value
        self._save()
        log("info", "guest", f"Guest network updated: ssid={value.ssid}")
    
    @property
    def firewall(self) -> List[FirewallRule]:
        return self._firewall
    
    def add_firewall_rule(self, rule: FirewallRule):
        self._firewall.append(rule)
        self._save()
        log("info", "firewall", f"Firewall rule added: port={rule.port}")
    
    def delete_firewall_rule(self, rule_id: str):
        self._firewall = [r for r in self._firewall if r.id != rule_id]
        self._save()
        log("info", "firewall", f"Firewall rule deleted: id={rule_id}")
    
    @property
    def port_forwards(self) -> List[PortForward]:
        return self._port_forwards
    
    def add_port_forward(self, forward: PortForward):
        self._port_forwards.append(forward)
        self._save()
        log("info", "portforward", f"Port forward added: {forward.external_port}->{forward.internal_ip}:{forward.internal_port}")
    
    def delete_port_forward(self, forward_id: str):
        self._port_forwards = [p for p in self._port_forwards if p.id != forward_id]
        self._save()
        log("info", "portforward", f"Port forward deleted: id={forward_id}")
    
    def block_client(self, mac: str, blocked: bool):
        if blocked:
            self._blocked_macs.add(mac)
        else:
            self._blocked_macs.discard(mac)
        self._save()
        log("info", "clients", f"Client {mac} {'blocked' if blocked else 'unblocked'}")
    
    def is_blocked(self, mac: str) -> bool:
        return mac in self._blocked_macs
    
    def forget_client(self, mac: str):
        self._blocked_macs.discard(mac)
        self._clients.pop(mac, None)
        self._save()
        log("info", "clients", f"Client {mac} forgotten")
    
    def rename_client(self, mac: str, name: str):
        if mac not in self._clients:
            self._clients[mac] = {}
        self._clients[mac]["name"] = name
        self._save()
        log("info", "clients", f"Client {mac} renamed to {name}")

state = StateManager()