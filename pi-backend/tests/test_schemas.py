import pytest
from src.models.schemas import (
    WifiSettings, VpnSettings, GuestNetwork, FirewallRule,
    PortForward, ClientDevice, RouterLog
)


class TestWifiSettings:
    def test_valid_wifi(self):
        w = WifiSettings(ssid="MyNetwork", password="secret1234", channel=6)
        assert w.ssid == "MyNetwork"
        assert w.channel == 6
        assert w.enabled is True

    def test_ssid_too_long(self):
        with pytest.raises(ValueError):
            WifiSettings(ssid="a" * 33, password="secret1234")

    def test_ssid_too_short(self):
        with pytest.raises(ValueError):
            WifiSettings(ssid="", password="secret1234")

    def test_password_too_short(self):
        with pytest.raises(ValueError):
            WifiSettings(ssid="MyNet", password="short")

    def test_password_too_long(self):
        with pytest.raises(ValueError):
            WifiSettings(ssid="MyNet", password="a" * 64)

    def test_channel_out_of_range(self):
        with pytest.raises(ValueError):
            WifiSettings(ssid="MyNet", password="secret1234", channel=0)
        with pytest.raises(ValueError):
            WifiSettings(ssid="MyNet", password="secret1234", channel=12)


class TestVpnSettings:
    def test_valid_vpn(self):
        v = VpnSettings(provider="wireguard", config="[Interface]", enabled=True)
        assert v.provider == "wireguard"

    def test_invalid_provider(self):
        with pytest.raises(ValueError, match="Provider"):
            VpnSettings(provider="unknown", config="")


class TestGuestNetwork:
    def test_valid_guest(self):
        g = GuestNetwork(ssid="Guest", password="guestpass123")
        assert g.ssid == "Guest"
        assert g.max_clients == 10

    def test_max_clients_out_of_range(self):
        with pytest.raises(ValueError):
            GuestNetwork(ssid="Guest", password="guestpass123", max_clients=0)
        with pytest.raises(ValueError):
            GuestNetwork(ssid="Guest", password="guestpass123", max_clients=100)


class TestFirewallRule:
    def test_valid_rule(self):
        r = FirewallRule(port=80, protocol="tcp", action="allow")
        assert r.port == 80
        assert r.protocol == "tcp"

    def test_invalid_port(self):
        with pytest.raises(ValueError):
            FirewallRule(port=0, protocol="tcp", action="allow")
        with pytest.raises(ValueError):
            FirewallRule(port=70000, protocol="tcp", action="allow")

    def test_invalid_protocol(self):
        with pytest.raises(ValueError, match="Protocol"):
            FirewallRule(port=80, protocol="invalid", action="allow")

    def test_invalid_action(self):
        with pytest.raises(ValueError, match="Action"):
            FirewallRule(port=80, protocol="tcp", action="invalid")


class TestPortForward:
    def test_valid_forward(self):
        p = PortForward(external_port=8080, internal_ip="192.168.1.100",
                        internal_port=80, protocol="tcp")
        assert p.external_port == 8080
        assert p.internal_ip == "192.168.1.100"

    def test_invalid_ports(self):
        with pytest.raises(ValueError):
            PortForward(external_port=0, internal_ip="192.168.1.1",
                        internal_port=80, protocol="tcp")

    def test_invalid_internal_ip(self):
        with pytest.raises(ValueError):
            PortForward(external_port=8080, internal_ip="bad-ip",
                        internal_port=80, protocol="tcp")


class TestClientDevice:
    def test_valid_client(self):
        c = ClientDevice(mac="aa:bb:cc:dd:ee:ff", ip="192.168.1.10")
        assert c.mac == "AA:BB:CC:DD:EE:FF"

    def test_invalid_mac(self):
        with pytest.raises(ValueError, match="Invalid MAC"):
            ClientDevice(mac="bad-mac", ip="192.168.1.10")

    def test_invalid_ip(self):
        with pytest.raises(ValueError, match="Invalid IP"):
            ClientDevice(mac="aa:bb:cc:dd:ee:ff", ip="bad-ip")


class TestRouterLog:
    def test_valid_log(self):
        l = RouterLog(timestamp=1000, level="info", source="test", message="hello")
        assert l.level == "info"

    def test_invalid_level(self):
        with pytest.raises(ValueError, match="Level"):
            RouterLog(timestamp=1000, level="critical", source="test", message="bad")
