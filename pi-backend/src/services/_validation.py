import re
from ipaddress import ip_address as ip_parse, AddressValueError
from typing import Optional

MAC_REGEX = re.compile(r'^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$')
IP_REGEX = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
HOSTAPD_SAFE_VALUE = re.compile(r'^[^\n\r\x00]+$')


def validate_mac(mac: str) -> str:
    if not MAC_REGEX.match(mac):
        raise ValueError("Invalid MAC address format")
    return mac.upper()


def validate_ip(ip: str) -> str:
    if not IP_REGEX.match(ip):
        raise ValueError("Invalid IP address format")
    try:
        ip_parse(ip)
    except (AddressValueError, ValueError):
        raise ValueError("Invalid IP address")
    return ip


def sanitize_hostapd_value(value: str, field: str) -> str:
    if not HOSTAPD_SAFE_VALUE.match(value):
        raise ValueError(f"hostapd config field '{field}' contains illegal characters")
    return value
