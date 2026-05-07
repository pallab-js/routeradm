from fastapi.testclient import TestClient
from src.main import app
from src.services.auth import settings

client = TestClient(app)

AUTH = {"Authorization": f"Bearer {settings.secret_token}"}


class TestBackupRestore:
    def test_export_backup(self):
        resp = client.get("/api/backup", headers=AUTH)
        assert resp.status_code == 200
        data = resp.json()
        assert "data" in data
        assert "exported_at" in data
        assert "version" in data["data"]
        assert "wifi" in data["data"]
        assert "firewall" in data["data"]

    def test_restore_backup(self):
        # First export
        export_resp = client.get("/api/backup", headers=AUTH)
        assert export_resp.status_code == 200
        backup_data = export_resp.json()["data"]

        # Restore it
        restore_resp = client.post("/api/restore", json=backup_data, headers=AUTH)
        assert restore_resp.status_code == 200
        assert restore_resp.json()["success"] is True

    def test_restore_requires_auth(self):
        resp = client.post("/api/restore", json={})
        assert resp.status_code == 401

    def test_export_requires_auth(self):
        resp = client.get("/api/backup")
        assert resp.status_code == 401
