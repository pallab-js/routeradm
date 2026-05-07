import pytest
from src.services._validation import validate_mac, validate_ip, sanitize_hostapd_value


class TestValidateMac:
    def test_valid_mac(self):
        assert validate_mac("aa:bb:cc:dd:ee:ff") == "AA:BB:CC:DD:EE:FF"
        assert validate_mac("AA:BB:CC:DD:EE:FF") == "AA:BB:CC:DD:EE:FF"
        assert validate_mac("00:11:22:33:44:55") == "00:11:22:33:44:55"

    def test_invalid_mac(self):
        with pytest.raises(ValueError, match="Invalid MAC"):
            validate_mac("not-a-mac")
        with pytest.raises(ValueError, match="Invalid MAC"):
            validate_mac("")
        with pytest.raises(ValueError, match="Invalid MAC"):
            validate_mac("aa:bb:cc:dd:ee:gg")


class TestValidateIp:
    def test_valid_ip(self):
        assert validate_ip("192.168.1.1") == "192.168.1.1"
        assert validate_ip("10.0.0.1") == "10.0.0.1"
        assert validate_ip("8.8.8.8") == "8.8.8.8"

    def test_invalid_ip(self):
        with pytest.raises(ValueError, match="Invalid IP"):
            validate_ip("not-an-ip")
        with pytest.raises(ValueError, match="Invalid IP"):
            validate_ip("256.1.2.3")
        with pytest.raises(ValueError, match="Invalid IP"):
            validate_ip("")


class TestSanitizeHostapd:
    def test_valid_values(self):
        assert sanitize_hostapd_value("MyNetwork", "ssid") == "MyNetwork"
        assert sanitize_hostapd_value("secure123", "password") == "secure123"

    def test_rejects_newlines(self):
        with pytest.raises(Exception):
            sanitize_hostapd_value("foo\nbar", "ssid")

    def test_rejects_null_bytes(self):
        with pytest.raises(Exception):
            sanitize_hostapd_value("foo\x00bar", "ssid")
