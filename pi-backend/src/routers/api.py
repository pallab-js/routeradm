import time
from fastapi import APIRouter, HTTPException, Header, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from typing import Optional, List
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
import json
from ..models.schemas import (
    RouterStatus, WifiSettings, VpnSettings, NetworkStats,
    ClientDevice, FirewallRule, PortForward, GuestNetwork, RouterLog
)
from ..services.auth import settings, authenticate_admin, create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_HOURS
from datetime import timedelta
from ..services import network, wifi, vpn, firewall, guest, logger as audit_logger
from ..services._validation import validate_mac
from ..services.limiter import limiter

router = APIRouter()


def verify_auth(authorization: Optional[str]) -> bool:
    if not authorization:
        audit_logger.audit_auth_attempt(False, None)
        return False
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    # Try JWT verification first
    payload = verify_token(token)
    if payload is not None:
        return True
    # Fallback to static token comparison
    expected = settings.secret_token
    if token == expected:
        return True
    audit_logger.audit_auth_attempt(False, None)
    return False


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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
    mac = validate_mac(mac)
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
    mac = validate_mac(mac)
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
    mac = validate_mac(mac)
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


@router.get("/ping")
@limiter.limit("30/minute")
async def ping_router(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    return {"pong": True, "timestamp": time.time()}


# --- Backup & Restore ---

class BackupResponse(BaseModel):
    data: dict
    exported_at: float

@router.get("/backup")
@limiter.limit("10/minute")
async def export_backup(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    from ..services.state import state
    data = state.export_backup()
    return BackupResponse(data=data, exported_at=time.time())


@router.post("/restore")
@limiter.limit("5/minute")
async def import_restore(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    body = await request.json()
    from ..services.state import state
    if state.import_backup(body):
        return {"success": True}
    raise HTTPException(status_code=400, detail="Failed to restore backup")


# --- Settings ---

@router.get("/settings")
@limiter.limit("30/minute")
async def get_settings(request: Request, authorization: Optional[str] = Header(None)):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    from ..services.state import state
    return {
        "api_host": settings.api_host,
        "api_port": settings.api_port,
        "log_level": state.get_setting("log_level") or settings.log_level,
        "wifi_interface": settings.wifi_interface,
        "wan_interface": settings.wan_interface,
        "wifi_country_code": state.get_setting("wifi_country_code") or settings.wifi_country_code,
    }


class SettingsUpdate(BaseModel):
    log_level: Optional[str] = None
    wifi_country_code: Optional[str] = None


@router.put("/settings")
@limiter.limit("10/minute")
async def update_settings(
    request: Request,
    body: SettingsUpdate,
    authorization: Optional[str] = Header(None)
):
    if not verify_auth(authorization):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    from ..services.state import state
    if body.log_level:
        if body.log_level.upper() not in ("DEBUG", "INFO", "WARNING", "ERROR"):
            raise HTTPException(status_code=400, detail="Invalid log level")
        state.set_setting("log_level", body.log_level.upper())
    if body.wifi_country_code:
        code = body.wifi_country_code.upper()
        if len(code) != 2 or not code.isalpha():
            raise HTTPException(status_code=400, detail="Invalid country code (must be 2 letters)")
        state.set_setting("wifi_country_code", code)
    audit_logger.audit_config_change("update", "settings", body.model_dump(exclude_none=True), get_client_ip(request))
    return {"success": True}


# --- WebSocket ---

import asyncio

connected_websockets: set = set()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connected_websockets.discard(websocket)


async def broadcast(message: dict):
    payload = json.dumps(message)
    dead = set()
    for ws in connected_websockets:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    connected_websockets.difference_update(dead)
