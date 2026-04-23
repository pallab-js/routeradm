from fastapi import APIRouter, HTTPException, Header, Request
from typing import Optional, List
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..models.schemas import (
    RouterStatus, WifiSettings, VpnSettings, NetworkStats, 
    ClientDevice, FirewallRule, PortForward, GuestNetwork, RouterLog
)
from ..services.auth import settings, authenticate_admin, create_access_token, ACCESS_TOKEN_EXPIRE_HOURS
from datetime import timedelta
from pydantic import BaseModel
from ..services import network, wifi, vpn, firewall, guest, logger as audit_logger
from ..main import limiter

import hmac

router = APIRouter()

_MAC_RE = __import__('re').compile(r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$')

def _validate_mac(mac: str) -> str:
    if not _MAC_RE.match(mac):
        raise HTTPException(status_code=422, detail="Invalid MAC address format")
    return mac.upper()

def verify_auth(authorization: Optional[str]) -> bool:
    if not authorization:
        audit_logger.audit_auth_attempt(False, None)
        return False
    expected = f"Bearer {settings.secret_token}"
    if not hmac.compare_digest(authorization, expected):
        audit_logger.audit_auth_attempt(False, None)
        return False
    return True

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def get_token_prefix(authorization: Optional[str]) -> str:
    if authorization and len(authorization) > 16:
        return authorization[:16] + "..."
    return authorization or "none"

@router.get("/status", response_model=RouterStatus)
@limiter.limit("60/minute")
async def get_status(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return network.get_router_status()

@router.get("/network/stats", response_model=NetworkStats)
@limiter.limit("60/minute")
async def get_network_stats(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return network.get_network_stats()

@router.get("/wifi", response_model=Optional[WifiSettings])
@limiter.limit("30/minute")
async def get_wifi(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return wifi.get_wifi_config()

@router.put("/wifi")
@limiter.limit("10/minute")
async def save_wifi(
    request: Request,
    wifi_settings: WifiSettings, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    success = wifi.save_wifi_config(wifi_settings)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save WiFi settings")
    audit_logger.audit_config_change("save", "wifi", {"ssid": wifi_settings.ssid}, get_client_ip(request))
    return {"success": True}

@router.get("/vpn", response_model=Optional[VpnSettings])
@limiter.limit("30/minute")
async def get_vpn(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return vpn.get_vpn_config()

@router.put("/vpn")
@limiter.limit("10/minute")
async def save_vpn(
    request: Request,
    vpn_settings: VpnSettings, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    success = vpn.save_vpn_config(vpn_settings)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save VPN settings")
    audit_logger.audit_config_change("save", "vpn", {"provider": vpn_settings.provider}, get_client_ip(request))
    return {"success": True}

@router.post("/vpn/toggle")
@limiter.limit("10/minute")
async def toggle_vpn(
    request: Request,
    enabled: bool, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    
    current = vpn.get_vpn_config()
    if not current:
        raise HTTPException(status_code=400, detail="No VPN configured")
    
    if enabled:
        success = vpn.start_vpn(current.provider, current.config)
    else:
        success = vpn.stop_vpn(current.provider)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to toggle VPN")
    audit_logger.audit_config_change("toggle", "vpn", {"enabled": enabled}, get_client_ip(request))
    return {"success": True}

@router.get("/clients", response_model=List[ClientDevice])
@limiter.limit("60/minute")
async def get_clients(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return network.get_connected_clients()

@router.post("/clients/{mac}/block")
@limiter.limit("20/minute")
async def block_client(
    request: Request,
    mac: str,
    blocked: bool,
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    mac = _validate_mac(mac)
    from ..services.state import state
    state.block_client(mac, blocked)
    audit_logger.audit_config_change("block", "clients", {"mac": mac, "blocked": blocked}, get_client_ip(request))
    return {"success": True}

@router.put("/clients/{mac}/name")
@limiter.limit("20/minute")
async def rename_client(
    request: Request,
    mac: str,
    name: str,
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    mac = _validate_mac(mac)
    from ..services.state import state
    state.rename_client(mac, name)
    audit_logger.audit_config_change("rename", "clients", {"mac": mac, "name": name}, get_client_ip(request))
    return {"success": True}

@router.delete("/clients/{mac}")
@limiter.limit("20/minute")
async def forget_client(
    request: Request,
    mac: str,
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    mac = _validate_mac(mac)
    from ..services.state import state
    state.forget_client(mac)
    audit_logger.audit_config_change("forget", "clients", {"mac": mac}, get_client_ip(request))
    return {"success": True}

@router.get("/firewall", response_model=List[FirewallRule])
@limiter.limit("60/minute")
async def get_firewall_rules(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return firewall.get_firewall_rules()

@router.post("/firewall")
@limiter.limit("20/minute")
async def add_firewall_rule(
    request: Request,
    rule: FirewallRule, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    success = firewall.add_firewall_rule(rule)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add firewall rule")
    audit_logger.audit_config_change("add", "firewall", {"port": rule.port, "protocol": rule.protocol}, get_client_ip(request))
    return {"success": True}

@router.delete("/firewall/{rule_id}")
@limiter.limit("20/minute")
async def delete_firewall_rule(
    request: Request,
    rule_id: str, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    firewall.delete_firewall_rule(rule_id)
    audit_logger.audit_config_change("delete", "firewall", {"rule_id": rule_id}, get_client_ip(request))
    return {"success": True}

@router.get("/portforward", response_model=List[PortForward])
@limiter.limit("60/minute")
async def get_port_forwards(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return firewall.get_port_forwards()

@router.post("/portforward")
@limiter.limit("20/minute")
async def add_port_forward(
    request: Request,
    forward: PortForward, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    success = firewall.add_port_forward(forward)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add port forward")
    audit_logger.audit_config_change("add", "portforward", {"port": forward.external_port}, get_client_ip(request))
    return {"success": True}

@router.delete("/portforward/{forward_id}")
@limiter.limit("20/minute")
async def delete_port_forward(
    request: Request,
    forward_id: str, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    firewall.delete_port_forward(forward_id)
    audit_logger.audit_config_change("delete", "portforward", {"forward_id": forward_id}, get_client_ip(request))
    return {"success": True}

@router.get("/guest", response_model=Optional[GuestNetwork])
@limiter.limit("30/minute")
async def get_guest_network(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return guest.get_guest_network()

@router.put("/guest")
@limiter.limit("10/minute")
async def save_guest_network(
    request: Request,
    guest_settings: GuestNetwork, 
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    success = guest.save_guest_network(guest_settings)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save guest network")
    audit_logger.audit_config_change("save", "guest", {"ssid": guest_settings.ssid}, get_client_ip(request))
    return {"success": True}

@router.get("/logs", response_model=List[RouterLog])
@limiter.limit("30/minute")
async def get_logs(
    request: Request,
    limit: int = 100,
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    limit = max(1, min(limit, 500))
    return audit_logger.get_logs(limit)

class LoginRequest(BaseModel):
    password: str

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    if not authenticate_admin(body.password):
        audit_logger.audit_auth_attempt(False, get_client_ip(request))
        raise HTTPException(status_code=401, detail="Invalid password")
    token = create_access_token(
        {"sub": "admin"},
        expires_delta=timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    audit_logger.audit_auth_attempt(True, get_client_ip(request))
    return {"access_token": token, "token_type": "bearer"}

import time as _time

@router.get("/ping")
@limiter.limit("30/minute")
async def ping_router(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return {"pong": True, "timestamp": _time.time()}