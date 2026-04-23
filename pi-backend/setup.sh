#!/bin/bash
set -e

echo "=== Travel Router Setup ==="
echo "This script will configure your Raspberry Pi as a travel router"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

echo "[1/7] Updating system..."
apt update && apt upgrade -y

echo "[2/7] Installing required packages..."
apt install -y hostapd dnsmasq iptables-persistent wireguard-tools \
    openvpn curl git python3 python3-pip python3-venv

echo "[3/7] Configuring network interfaces..."
cat >> /etc/dhcpcd.conf <<EOF

interface wlan0
static ip_address=192.168.1.1/24
nohook wpa_supplicant

interface wlan1
static ip_address=192.168.2.1/24
nohook wpa_supplicant
EOF

echo "[4/7] Configuring DHCP (dnsmasq)..."
cat > /etc/dnsmasq.conf <<EOF
interface=wlan0
dhcp-range=192.168.1.100,192.168.1.200,255.255.255.0,24h
domain=wlan
local=/wlan/

interface=wlan1
dhcp-range=192.168.2.100,192.168.2.200,255.255.255.0,24h
domain=guest
local=/guest/
EOF

echo "[5/7] Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf

echo "[6/7] Setting up NAT..."
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT

echo "[7/7] Installing Python dependencies..."
cd /opt
git clone https://github.com/yourusername/travel-router-admin.git
cd travel-router-admin/pi-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings

cp .env.example .env
echo "Edit /opt/travel-router-admin/pi-backend/.env with your token"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the API:"
echo "  cd /opt/travel-router-admin/pi-backend"
echo "  source venv/bin/activate"
echo "  python -m uvicorn src.main:app --host 0.0.0.0 --port 8080"
echo ""
echo "To enable on boot, create a systemd service"