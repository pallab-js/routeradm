import re
from pydantic import BaseModel, field_validator
from typing import Optional
from ipaddress import ip_address as ip_parse, AddressValueError

MAC_REGEX = re.compile(r'^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$')
IP_REGEX = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')

class RouterStatus(BaseModel):
    wan_ip: Optional[str] = None
    clients: int = 0
    vpn_active: bool = False
    ap_ssid: str = ""
    signal_rssi: int = 0

class WifiSettings(BaseModel):
    ssid: str
    password: str
    channel: int = 6
    enabled: bool = True
    
    @field_validator("ssid")
    @classmethod
    def validate_ssid(cls, v: str) -> str:
        if not v or len(v) > 32:
            raise ValueError("SSID must be 1-32 characters")
        if not re.match(r'^[\w\-\s]+$', v):
            raise ValueError("SSID contains invalid characters")
        return v
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("WiFi password must be at least 8 characters")
        if len(v) > 63:
            raise ValueError("WiFi password must be at most 63 characters")
        return v
    
    @field_validator("channel")
    @classmethod
    def validate_channel(cls, v: int) -> int:
        if v < 1 or v > 11:
            raise ValueError("WiFi channel must be 1-11 (US)")
        return v

class VpnSettings(BaseModel):
    provider: str = ""
    config: str = ""
    enabled: bool = False
    
    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        if v and v.lower() not in ("wireguard", "openvpn"):
            raise ValueError("Provider must be wireguard or openvpn")
        return v.lower() if v else v

class NetworkStats(BaseModel):
    rx_bytes: int = 0
    tx_bytes: int = 0
    rx_rate: int = 0
    tx_rate: int = 0
    wan_uptime: int = 0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0

class ClientDevice(BaseModel):
    mac: str
    ip: str
    hostname: Optional[str] = None
    name: Optional[str] = None
    connected_at: int = 0
    rx_bytes: int = 0
    tx_bytes: int = 0
    blocked: bool = False
    
    @field_validator("mac")
    @classmethod
    def validate_mac(cls, v: str) -> str:
        if not MAC_REGEX.match(v):
            raise ValueError("Invalid MAC address format")
        return v.upper()
    
    @field_validator("ip")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        if not IP_REGEX.match(v):
            raise ValueError("Invalid IP address format")
        try:
            ip_parse(v)
        except AddressValueError:
            raise ValueError("Invalid IP address")
        return v

class FirewallRule(BaseModel):
    id: str = ""
    port: int
    protocol: str
    action: str
    source_ip: Optional[str] = None
    enabled: bool = True
    description: Optional[str] = None
    
    @field_validator("port")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if v < 1 or v > 65535:
            raise ValueError("Port must be 1-65535")
        return v
    
    @field_validator("protocol")
    @classmethod
    def validate_protocol(cls, v: str) -> str:
        if v.lower() not in ("tcp", "udp", "icmp"):
            raise ValueError("Protocol must be tcp, udp, or icmp")
        return v.lower()
    
    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v.lower() not in ("allow", "drop", "accept"):
            raise ValueError("Action must be allow, drop, or accept")
        return v.lower()
    
    @field_validator("source_ip")
    @classmethod
    def validate_source_ip(cls, v: Optional[str]) -> Optional[str]:
        if v:
            if not IP_REGEX.match(v):
                raise ValueError("Invalid source IP format")
            try:
                ip_parse(v)
            except AddressValueError:
                raise ValueError("Invalid source IP address")
        return v

class PortForward(BaseModel):
    id: str = ""
    external_port: int
    internal_ip: str
    internal_port: int
    protocol: str
    enabled: bool = True
    description: Optional[str] = None
    
    @field_validator("external_port", "internal_port")
    @classmethod
    def validate_ports(cls, v: int) -> int:
        if v < 1 or v > 65535:
            raise ValueError("Port must be 1-65535")
        return v
    
    @field_validator("internal_ip")
    @classmethod
    def validate_internal_ip(cls, v: str) -> str:
        if not IP_REGEX.match(v):
            raise ValueError("Invalid internal IP format")
        try:
            ip_parse(v)
        except AddressValueError:
            raise ValueError("Invalid internal IP address")
        return v
    
    @field_validator("protocol")
    @classmethod
    def validate_protocol(cls, v: str) -> str:
        if v.lower() not in ("tcp", "udp"):
            raise ValueError("Protocol must be tcp or udp")
        return v.lower()

class GuestNetwork(BaseModel):
    ssid: str
    password: str
    channel: int = 6
    enabled: bool = False
    isolated: bool = True
    max_clients: int = 10
    
    @field_validator("ssid")
    @classmethod
    def validate_ssid(cls, v: str) -> str:
        if not v or len(v) > 32:
            raise ValueError("SSID must be 1-32 characters")
        return v
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Guest password must be at least 8 characters")
        return v
    
    @field_validator("max_clients")
    @classmethod
    def validate_max_clients(cls, v: int) -> int:
        if v < 1 or v > 50:
            raise ValueError("Max clients must be 1-50")
        return v

class RouterLog(BaseModel):
    timestamp: int
    level: str
    source: str
    message: str
    
    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        if v.lower() not in ("debug", "info", "warn", "error"):
            raise ValueError("Level must be debug, info, warn, or error")
        return v.lower()

def validate_mac(mac: str) -> str:
    if not MAC_REGEX.match(mac):
        raise ValueError("Invalid MAC address format")
    return mac.upper()

def validate_ip(ip: str) -> str:
    if not IP_REGEX.match(ip):
        raise ValueError("Invalid IP address format")
    try:
        ip_parse(ip)
    except AddressValueError:
        raise ValueError("Invalid IP address")
    return ip