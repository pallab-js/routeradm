import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.services.auth import settings

client = TestClient(app)


class TestAuth:
    def test_no_token_returns_401(self):
        resp = client.get("/api/status")
        assert resp.status_code == 401

    def test_bad_token_returns_401(self):
        resp = client.get("/api/status", headers={"Authorization": "Bearer bad-token"})
        assert resp.status_code == 401

    def test_valid_token_succeeds(self):
        resp = client.get("/api/status", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 200

    def test_invalid_method_returns_405(self):
        resp = client.post("/api/status", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 405


class TestEndpoints:
    def test_wifi_get(self):
        resp = client.get("/api/wifi", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        # May return 200 or 500 depending on state
        assert resp.status_code in (200, 500)

    def test_logs_get(self):
        resp = client.get("/api/logs", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_ping(self):
        resp = client.get("/api/ping", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["pong"] is True
        assert "timestamp" in data

    def test_clients_get(self):
        resp = client.get("/api/clients", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_firewall_get(self):
        resp = client.get("/api/firewall", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_portforwards_get(self):
        resp = client.get("/api/portforward", headers={
            "Authorization": f"Bearer {settings.secret_token}"
        })
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestAuthFallback:
    def test_jwt_token_accepted(self):
        from src.services.auth import create_access_token
        jwt_token = create_access_token({"sub": "admin"})
        resp = client.get("/api/ping", headers={
            "Authorization": f"Bearer {jwt_token}"
        })
        assert resp.status_code == 200
