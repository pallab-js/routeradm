#!/bin/bash
set -e

echo "=== Travel Router Setup ==="
echo "This script will configure your Raspberry Pi as a travel router"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

# Create dedicated unprivileged user
if ! id -u router-api >/dev/null 2>&1; then
    echo "[1/9] Creating router-api system user..."
    useradd --system --no-create-home --shell /usr/sbin/nologin router-api
else
    echo "[1/9] router-api user already exists"
fi

echo "[2/9] Updating system..."
apt update && apt upgrade -y

echo "[3/9] Installing required packages..."
apt install -y hostapd dnsmasq iptables-persistent wireguard-tools \
    openvpn curl git python3 python3-pip python3-venv

echo "[4/9] Configuring network interfaces..."
cat >> /etc/dhcpcd.conf <<EOF

interface wlan0
static ip_address=192.168.1.1/24
nohook wpa_supplicant

interface wlan1
static ip_address=192.168.2.1/24
nohook wpa_supplicant
EOF

echo "[5/9] Configuring DHCP (dnsmasq)..."
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

echo "[6/9] Enabling IP forwarding..."
echo 1 > /proc/sys/net/ipv4/ip_forward
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf

echo "[7/9] Setting up NAT..."
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT

echo "[8/9] Setting up sudo permissions for router-api user..."
cat > /etc/sudoers.d/router-api <<EOF
# Allow router-api to manage networking services
router-api ALL=(root) NOPASSWD: /usr/sbin/hostapd
router-api ALL=(root) NOPASSWD: /usr/sbin/wg-quick
router-api ALL=(root) NOPASSWD: /usr/sbin/iptables
router-api ALL=(root) NOPASSWD: /usr/sbin/iptables-save
router-api ALL=(root) NOPASSWD: /usr/sbin/iptables-restore
router-api ALL=(root) NOPASSWD: /bin/systemctl start hostapd
router-api ALL=(root) NOPASSWD: /bin/systemctl stop hostapd
router-api ALL=(root) NOPASSWD: /bin/systemctl start openvpn@*
router-api ALL=(root) NOPASSWD: /bin/systemctl stop openvpn@*
EOF
chmod 440 /etc/sudoers.d/router-api

echo "[9/9] Installing Python dependencies..."
INSTALL_DIR=/opt/travel-router-admin
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Clone if not already present
if [ ! -d "$INSTALL_DIR/pi-backend" ]; then
    # Replace this URL with your actual repository
    git clone https://github.com/pallab-js/routeradm.git
fi

cd "$INSTALL_DIR/pi-backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings

# Generate secure default token if none exists
if [ ! -f .env ]; then
    cp .env.example .env
    GENERATED_TOKEN=$(openssl rand -hex 32)
    GENERATED_PASSWORD=$(openssl rand -base64 16)
    sed -i "s/your-secure-token-here/$GENERATED_TOKEN/" .env
    sed -i "s/your-secure-password-here/$GENERATED_PASSWORD/" .env
    echo "Generated admin password: $GENERATED_PASSWORD"
    echo "Save this password - it won't be shown again."
fi

# Set ownership to router-api user
chown -R router-api:router-api "$INSTALL_DIR"
chmod 750 "$INSTALL_DIR"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start the API:"
echo "  sudo -u router-api $INSTALL_DIR/pi-backend/venv/bin/python \\"
echo "    -m uvicorn src.main:app --host 0.0.0.0 --port 8080"
echo ""
echo "To enable on boot, copy router-api.service to /etc/systemd/system/"
echo "  cp $INSTALL_DIR/pi-backend/router-api.service /etc/systemd/system/"
echo "  systemctl daemon-reload"
echo "  systemctl enable --now router-api"
