# Travel Router API (Pi Backend)

FastAPI backend for Raspberry Pi travel router management.

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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Router status |
| `/api/network/stats` | GET | Network statistics |
| `/api/wifi` | GET/PUT | Wi-Fi configuration |
| `/api/vpn` | GET/PUT | VPN settings |
| `/api/vpn/toggle` | POST | Toggle VPN |
| `/api/clients` | GET | Connected clients |
| `/api/clients/{mac}/block` | POST | Block client |
| `/api/firewall` | GET/POST/DELETE | Firewall rules |
| `/api/portforward` | GET/POST/DELETE | Port forwarding |
| `/api/guest` | GET/PUT | Guest network |
| `/api/logs` | GET | System logs |
| `/api/ping` | GET | Health check |

## Authentication

Pass token via `Authorization: Bearer <token>` header.

## Default Configuration

- Default token: `change-me-in-production` (change in `.env`)
- API port: `8080`
- Wi-Fi interface: `wlan0`
- WAN interface: `eth0`

## Hardware Setup

- `wlan0`: Access Point (primary Wi-Fi)
- `wlan1`: Guest network (optional)
- `eth0`: Ethernet WAN

## Security Notes

- Change default token before deployment
- Use strong Wi-Fi passwords
- Keep the Pi updated
- Only expose API on local network