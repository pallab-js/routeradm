import json
import sqlite3
import os
import time
import threading
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import contextmanager
from ..models.schemas import (
    WifiSettings, VpnSettings, GuestNetwork,
    FirewallRule, PortForward
)
from .logger import log

import tempfile

STATE_DIR = Path(os.environ.get("ROUTER_STATE_DIR", "/var/lib/router-api"))
DB_PATH = STATE_DIR / "state.db"
try:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(str(STATE_DIR), 0o750)
except PermissionError:
    STATE_DIR = Path(tempfile.gettempdir()) / "router-api"
    DB_PATH = STATE_DIR / "state.db"
    STATE_DIR.mkdir(parents=True, exist_ok=True)

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wifi (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    ssid TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '',
    channel INTEGER NOT NULL DEFAULT 6,
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vpn (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provider TEXT NOT NULL DEFAULT '',
    config TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guest (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    ssid TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL DEFAULT '',
    channel INTEGER NOT NULL DEFAULT 6,
    enabled INTEGER NOT NULL DEFAULT 0,
    isolated INTEGER NOT NULL DEFAULT 1,
    max_clients INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS firewall_rules (
    id TEXT PRIMARY KEY,
    port INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    action TEXT NOT NULL,
    source_ip TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    description TEXT
);

CREATE TABLE IF NOT EXISTS port_forwards (
    id TEXT PRIMARY KEY,
    external_port INTEGER NOT NULL,
    internal_ip TEXT NOT NULL,
    internal_port INTEGER NOT NULL,
    protocol TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    description TEXT
);

CREATE TABLE IF NOT EXISTS blocked_macs (
    mac TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS client_names (
    mac TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT ''
);
"""


class StateManager:
    def __init__(self):
        self._local = threading.local()
        self._init_db()
        self._cache: Dict[str, Any] = {}
        self._load_cache()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(
                str(DB_PATH),
                timeout=5,
                check_same_thread=False
            )
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA journal_mode=WAL")
            self._local.conn.execute("PRAGMA foreign_keys=ON")
        return self._local.conn

    def _init_db(self):
        conn = sqlite3.connect(str(DB_PATH), timeout=5)
        conn.executescript(_SCHEMA_SQL)
        conn.commit()
        conn.close()
        os.chmod(str(DB_PATH), 0o600)

    @contextmanager
    def _transaction(self):
        conn = self._get_conn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def _load_cache(self):
        with self._transaction() as conn:
            row = conn.execute("SELECT ssid, password, channel, enabled FROM wifi WHERE id = 1").fetchone()
            self._wifi = WifiSettings(**dict(row)) if row and row["ssid"] else None

            row = conn.execute("SELECT provider, config, enabled FROM vpn WHERE id = 1").fetchone()
            self._vpn = VpnSettings(**dict(row)) if row and row["provider"] else None

            row = conn.execute("SELECT ssid, password, channel, enabled, isolated, max_clients FROM guest WHERE id = 1").fetchone()
            self._guest = GuestNetwork(**dict(row)) if row and row["ssid"] else None

            rows = conn.execute("SELECT id, port, protocol, action, source_ip, enabled, description FROM firewall_rules").fetchall()
            self._firewall = [FirewallRule(**dict(r)) for r in rows]

            rows = conn.execute("SELECT id, external_port, internal_ip, internal_port, protocol, enabled, description FROM port_forwards").fetchall()
            self._port_forwards = [PortForward(**dict(r)) for r in rows]

            rows = conn.execute("SELECT mac FROM blocked_macs").fetchall()
            self._blocked_macs = {r["mac"] for r in rows}

            rows = conn.execute("SELECT mac, name FROM client_names").fetchall()
            self._clients: Dict[str, dict] = {r["mac"]: {"name": r["name"]} for r in rows}

    # --- WiFi ---

    @property
    def wifi(self) -> Optional[WifiSettings]:
        return self._wifi

    @wifi.setter
    def wifi(self, value: WifiSettings):
        self._wifi = value
        with self._transaction() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO wifi (id, ssid, password, channel, enabled)
                   VALUES (1, ?, ?, ?, ?)""",
                (value.ssid, "", value.channel, 1 if value.enabled else 0)
            )
        log("info", "wifi", f"WiFi settings updated: ssid={value.ssid}")

    # --- VPN ---

    @property
    def vpn(self) -> Optional[VpnSettings]:
        return self._vpn

    @vpn.setter
    def vpn(self, value: VpnSettings):
        self._vpn = value
        with self._transaction() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO vpn (id, provider, config, enabled)
                   VALUES (1, ?, ?, ?)""",
                (value.provider, "", 1 if value.enabled else 0)
            )
        log("info", "vpn", f"VPN settings updated: provider={value.provider}")

    # --- Guest ---

    @property
    def guest(self) -> Optional[GuestNetwork]:
        return self._guest

    @guest.setter
    def guest(self, value: GuestNetwork):
        self._guest = value
        with self._transaction() as conn:
            conn.execute(
                """INSERT OR REPLACE INTO guest (id, ssid, password, channel, enabled, isolated, max_clients)
                   VALUES (1, ?, ?, ?, ?, ?, ?)""",
                (value.ssid, "", value.channel,
                 1 if value.enabled else 0,
                 1 if value.isolated else 0,
                 value.max_clients)
            )
        log("info", "guest", f"Guest network updated: ssid={value.ssid}")

    # --- Firewall ---

    @property
    def firewall(self) -> List[FirewallRule]:
        return self._firewall

    def add_firewall_rule(self, rule: FirewallRule):
        self._firewall.append(rule)
        with self._transaction() as conn:
            conn.execute(
                """INSERT INTO firewall_rules (id, port, protocol, action, source_ip, enabled, description)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (rule.id, rule.port, rule.protocol, rule.action,
                 rule.source_ip, 1 if rule.enabled else 0, rule.description)
            )
        log("info", "firewall", f"Firewall rule added: port={rule.port}")

    def delete_firewall_rule(self, rule_id: str):
        self._firewall = [r for r in self._firewall if r.id != rule_id]
        with self._transaction() as conn:
            conn.execute("DELETE FROM firewall_rules WHERE id = ?", (rule_id,))
        log("info", "firewall", f"Firewall rule deleted: id={rule_id}")

    # --- Port Forwards ---

    @property
    def port_forwards(self) -> List[PortForward]:
        return self._port_forwards

    def add_port_forward(self, forward: PortForward):
        self._port_forwards.append(forward)
        with self._transaction() as conn:
            conn.execute(
                """INSERT INTO port_forwards (id, external_port, internal_ip, internal_port, protocol, enabled, description)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (forward.id, forward.external_port, forward.internal_ip,
                 forward.internal_port, forward.protocol,
                 1 if forward.enabled else 0, forward.description)
            )
        log("info", "portforward",
            f"Port forward added: {forward.external_port}->{forward.internal_ip}:{forward.internal_port}")

    def delete_port_forward(self, forward_id: str):
        self._port_forwards = [p for p in self._port_forwards if p.id != forward_id]
        with self._transaction() as conn:
            conn.execute("DELETE FROM port_forwards WHERE id = ?", (forward_id,))
        log("info", "portforward", f"Port forward deleted: id={forward_id}")

    # --- Clients ---

    def block_client(self, mac: str, blocked: bool):
        if blocked:
            self._blocked_macs.add(mac)
        else:
            self._blocked_macs.discard(mac)
        with self._transaction() as conn:
            if blocked:
                conn.execute("INSERT OR IGNORE INTO blocked_macs (mac) VALUES (?)", (mac,))
            else:
                conn.execute("DELETE FROM blocked_macs WHERE mac = ?", (mac,))
        log("info", "clients", f"Client {mac} {'blocked' if blocked else 'unblocked'}")

    def is_blocked(self, mac: str) -> bool:
        return mac in self._blocked_macs

    def forget_client(self, mac: str):
        self._blocked_macs.discard(mac)
        self._clients.pop(mac, None)
        with self._transaction() as conn:
            conn.execute("DELETE FROM blocked_macs WHERE mac = ?", (mac,))
            conn.execute("DELETE FROM client_names WHERE mac = ?", (mac,))
        log("info", "clients", f"Client {mac} forgotten")

    def rename_client(self, mac: str, name: str):
        if mac not in self._clients:
            self._clients[mac] = {}
        self._clients[mac]["name"] = name
        with self._transaction() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO client_names (mac, name) VALUES (?, ?)",
                (mac, name)
            )
        log("info", "clients", f"Client {mac} renamed to {name}")

    def get_client_name(self, mac: str) -> Optional[str]:
        client = self._clients.get(mac)
        if client:
            return client.get("name")
        return None

    # --- Settings (stored in meta table) ---

    def get_setting(self, key: str) -> Optional[str]:
        with self._transaction() as conn:
            row = conn.execute(
                "SELECT value FROM meta WHERE key = ?", (key,)
            ).fetchone()
            return row["value"] if row else None

    def set_setting(self, key: str, value: str):
        with self._transaction() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
                (key, value)
            )
        log("info", "settings", f"Setting {key} updated to {value}")

    # --- Backup / Restore ---

    def export_backup(self) -> dict:
        return {
            "version": 2,
            "timestamp": int(time.time()),
            "wifi": self._wifi.model_dump() if self._wifi else None,
            "vpn": {"provider": self._vpn.provider, "enabled": self._vpn.enabled} if self._vpn else None,
            "guest": self._guest.model_dump() if self._guest else None,
            "firewall": [r.model_dump() for r in self._firewall],
            "port_forwards": [p.model_dump() for p in self._port_forwards],
            "blocked_macs": list(self._blocked_macs),
            "client_names": {mac: d.get("name", "") for mac, d in self._clients.items()},
        }

    def import_backup(self, data: dict) -> bool:
        try:
            with self._transaction() as conn:
                conn.executescript("""
                    DELETE FROM wifi;
                    DELETE FROM vpn;
                    DELETE FROM guest;
                    DELETE FROM firewall_rules;
                    DELETE FROM port_forwards;
                    DELETE FROM blocked_macs;
                    DELETE FROM client_names;
                """)
                if data.get("wifi"):
                    w = data["wifi"]
                    conn.execute(
                        "INSERT INTO wifi (id, ssid, password, channel, enabled) VALUES (1, ?, '', ?, ?)",
                        (w["ssid"], w.get("channel", 6), 1 if w.get("enabled", True) else 0)
                    )
                if data.get("vpn"):
                    v = data["vpn"]
                    conn.execute(
                        "INSERT INTO vpn (id, provider, config, enabled) VALUES (1, ?, '', ?)",
                        (v.get("provider", ""), 1 if v.get("enabled", False) else 0)
                    )
                if data.get("guest"):
                    g = data["guest"]
                    conn.execute(
                        "INSERT INTO guest (id, ssid, password, channel, enabled, isolated, max_clients) VALUES (1, ?, '', ?, ?, ?, ?)",
                        (g["ssid"], g.get("channel", 6),
                         1 if g.get("enabled", False) else 0,
                         1 if g.get("isolated", True) else 0,
                         g.get("max_clients", 10))
                    )
                for r in data.get("firewall", []):
                    conn.execute(
                        "INSERT INTO firewall_rules VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (r.get("id", ""), r["port"], r["protocol"], r["action"],
                         r.get("source_ip"), 1 if r.get("enabled", True) else 0, r.get("description"))
                    )
                for p in data.get("port_forwards", []):
                    conn.execute(
                        "INSERT INTO port_forwards VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (p.get("id", ""), p["external_port"], p["internal_ip"],
                         p["internal_port"], p["protocol"],
                         1 if p.get("enabled", True) else 0, p.get("description"))
                    )
                for mac in data.get("blocked_macs", []):
                    conn.execute("INSERT OR IGNORE INTO blocked_macs (mac) VALUES (?)", (mac,))
                for mac, name in data.get("client_names", {}).items():
                    conn.execute("INSERT OR REPLACE INTO client_names (mac, name) VALUES (?, ?)", (mac, name))
            self._load_cache()
            log("info", "state", "Backup imported successfully")
            return True
        except Exception as e:
            log("error", "state", f"Failed to import backup: {e}")
            return False


state = StateManager()
