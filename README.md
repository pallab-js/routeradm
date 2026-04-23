# TravelRouter Admin

A macOS desktop application for managing and administering Raspberry Pi-based travel routers. Provides complete control over WiFi, VPN, firewall, guest networks, and connected devices.

## Overview

TravelRouter Admin transforms a Raspberry Pi into a portable travel router that can be deployed anywhere to create secure wireless networks. The macOS admin app connects to the Pi backend API to manage all router operations in real-time.

## Features

| Category | Capabilities |
|----------|-------------|
| **WiFi AP** | SSID, channel (1-11), WPA2 password, enable/disable |
| **VPN** | WireGuard & OpenVPN providers, toggle on/off |
| **Firewall** | iptables-based rules by port/protocol, allow/drop actions |
| **Port Forwarding** | DNAT rules to internal devices |
| **Guest Network** | Isolated WiFi, max client limits, separate SSID |
| **Clients** | Device list, block by MAC, rename devices |
| **Monitoring** | WAN IP, connected clients, RX/TX stats, CPU/memory |
| **Audit** | Full config change logging with timestamps |

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   macOS Admin App    │         │   Raspberry Pi     │
│   (Tauri + Next.js)│◄───────►│   (Pi Backend)    │
└─────────────────────┘  HTTP   └─────────────────────┘
                                          │
                         ┌────────────────┼────────────────┐
                         ▼                ▼                ▼
                    ┌─────────┐     ┌─────────┐     ┌─────────┐
                    │ hostapd │     │ wg/op  │     │ iptables│
                    │(WiFi AP)│     │ (VPN)  │     │(Firewall)│
                    └─────────┘     └─────────┘     └─────────┘
```

## Components

| Component | Directory | Technology |
|-----------|-----------|------------|
| **macOS Admin App** | `frontend/` | Tauri 2.x + Next.js 16 |
| **Pi Backend** | `pi-backend/` | FastAPI + Python |

## Requirements

### Raspberry Pi
- Raspberry Pi 3B+ or 4
- Wi-Fi adapter (built-in for Pi 3B+/4)
- Ethernet for WAN connection
- Raspberry Pi OS Lite

### macOS
- macOS 11.0+
- Rust 1.77.2+
- Node.js 20+

## Quick Start

### 1. Deploy Pi Backend

```bash
# Copy backend to Pi
scp -r pi-backend pi@192.168.1.1:/opt/

# SSH into Pi
ssh pi@192.168.1.1

# Run setup script
sudo ./setup.sh

# Configure environment
nano /opt/pi-backend/.env

# Install and start service
sudo cp /opt/pi-backend/router-api.service /etc/systemd/system/
sudo systemctl enable --now router-api
```

### 2. Build macOS App

```bash
# Install dependencies and build
cd frontend && npm install && npm run build
cargo tauri build
```

## Configuration

### Environment Variables (Pi)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_TOKEN` | Bearer token for auth | (required) |
| `API_HOST` | Listen address | `0.0.0.0` |
| `API_PORT` | Listen port | `8080` |
| `WAN_INTERFACE` | Ethernet device | `eth0` |
| `WIFI_INTERFACE` | WiFi device | `wlan0` |

### API Endpoints

| Endpoint | Method | Description |
|----------|-------|-------------|
| `/api/status` | GET | Router status |
| `/api/network/stats` | GET | Network statistics |
| `/api/wifi` | GET/PUT | WiFi settings |
| `/api/vpn` | GET/PUT | VPN settings |
| `/api/vpn/toggle` | POST | Enable/disable VPN |
| `/api/clients` | GET | Connected devices |
| `/api/clients/{mac}/block` | POST | Block/unblock device |
| `/api/clients/{mac}/rename` | POST | Rename device |
| `/api/firewall` | GET/POST | Firewall rules |
| `/api/firewall/{id}` | DELETE | Remove rule |
| `/api/portforward` | GET/POST | Port forwards |
| `/api/portforward/{id}` | DELETE | Remove forward |
| `/api/guest` | GET/PUT | Guest network |
| `/api/logs` | GET | Audit logs |

## Security

- Bearer token authentication on all endpoints
- Input validation on all requests (Pydantic)
- Rate limiting to prevent abuse
- Permissions: state files at `0o600`
- Sensitive config (WireGuard) stored securely

## License

MIT