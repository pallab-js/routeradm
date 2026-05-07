# Travel Router API (Pi Backend)

FastAPI backend for Raspberry Pi travel router management. v2.0.0

## Requirements

- Raspberry Pi with Wi-Fi (or USB Wi-Fi adapter for second interface)
- Raspberry Pi OS (Lite recommended)
- Ethernet connection for internet (WAN)

## Installation

```bash
# Run the setup script
sudo chmod +x setup.sh
sudo ./setup.sh

# Configure environment
nano /opt/travel-router-admin/pi-backend/.env

# Start the service
sudo cp router-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable router-api
sudo systemctl start router-api
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_TOKEN` | Yes | — | Bearer token (min 32 chars) |
| `ADMIN_PASSWORD` | No | — | Password for JWT login |
| `API_HOST` | No | `0.0.0.0` | Listen address |
| `API_PORT` | No | `8080` | Listen port |
| `WIFI_INTERFACE` | No | `wlan0` | WiFi AP interface |
| `WAN_INTERFACE` | No | `eth0` | Ethernet WAN interface |
| `WIFI_COUNTRY_CODE` | No | `US` | ISO 3166-1 alpha-2 |
| `ALLOW_HTTP` | No | `false` | Allow HTTP in production |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | CORS origins |

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/status` | GET | Bearer | Router status |
| `/api/network/stats` | GET | Bearer | Network statistics with rate |
| `/api/wifi` | GET/PUT | Bearer | Wi-Fi configuration |
| `/api/vpn` | GET/PUT | Bearer | VPN settings |
| `/api/vpn/toggle` | POST | Bearer | Toggle VPN on/off |
| `/api/clients` | GET | Bearer | Connected clients |
| `/api/clients/{mac}/block` | POST | Bearer | Block/unblock client |
| `/api/clients/{mac}/name` | PUT | Bearer | Rename client |
| `/api/clients/{mac}` | DELETE | Bearer | Forget client |
| `/api/firewall` | GET/POST | Bearer | Firewall rules |
| `/api/firewall/{id}` | DELETE | Bearer | Delete firewall rule |
| `/api/portforward` | GET/POST | Bearer | Port forwarding rules |
| `/api/portforward/{id}` | DELETE | Bearer | Delete port forward |
| `/api/guest` | GET/PUT | Bearer | Guest network |
| `/api/logs` | GET | Bearer | System logs (`?limit=N`) |
| `/api/login` | POST | None | JWT authentication |
| `/api/ping` | GET | Bearer | Health check |
| `/api/backup` | GET | Bearer | Export config JSON |
| `/api/restore` | POST | Bearer | Import config JSON |
| `/api/settings` | GET/PUT | Bearer | Runtime settings |
| `/api/ws` | WebSocket | — | Real-time events |

## Authentication

Two methods:
- **Legacy**: `Authorization: Bearer <SECRET_TOKEN>`
- **JWT**: `POST /api/login` with `{"password": "..."}`, use returned token

## Architecture

```
src/
├── main.py              # FastAPI app, CORS, lifespan
├── models/schemas.py    # Pydantic models with validation
├── routers/api.py       # All API route handlers
└── services/
    ├── auth.py          # JWT + static token auth
    ├── firewall.py      # iptables management
    ├── guest.py         # Guest AP (hostapd)
    ├── limiter.py       # Rate limiting (slowapi)
    ├── logger.py        # Structured audit logging
    ├── network.py       # Status, stats, clients
    ├── state.py         # SQLite-backed state manager
    ├── utils.py         # Subprocess + permissions helpers
    ├── vpn.py           # WireGuard + OpenVPN
    ├── wifi.py          # Primary AP (hostapd)
    └── _validation.py   # MAC/IP/hostapd validation
```

## Development

```bash
pip install -r requirements-dev.txt
SECRET_TOKEN="test-token-32-chars-minimum" ADMIN_PASSWORD="test" \
  python -m pytest tests/ -v
```

## Hardware Setup

- `wlan0`: Access Point (primary Wi-Fi)
- `wlan1`: Guest network (optional)
- `eth0`: Ethernet WAN

## Security Notes

- `SECRET_TOKEN` must be ≥32 characters
- Change default token before deployment
- State stored in SQLite at `/var/lib/router-api/state.db` (mode 0600)
- Logs at `/var/log/router-api*.log` (fallback to `/tmp`)
- Rate limited per-endpoint (10-60 requests/min)
