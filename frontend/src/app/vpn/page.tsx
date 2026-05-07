"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VpnPage() {
  const { piUrl, token } = useStore();
  const { fetchVpn, saveVpn, toggleVpn } = usePi();
  const [provider, setProvider] = useState("wireguard");
  const [config, setConfig] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    
    async function loadVpn() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      const data = await fetchVpn();
      if (mounted && data) {
        setProvider(data.provider);
        setConfig(data.config);
        setEnabled(data.enabled);
        setLoading(false);
      } else if (mounted) {
        setLoading(false);
      }
    }
    
    loadVpn();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piUrl, token]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const success = await saveVpn({ provider, config, enabled });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError("Failed to save VPN settings");
    }
  };

  const handleToggle = async () => {
    setError("");
    const newEnabled = !enabled;
    const success = await toggleVpn(newEnabled);
    if (success) {
      setEnabled(newEnabled);
    } else {
      setError("Failed to toggle VPN");
    }
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="p-8">
          <h2>VPN Configuration</h2>
          <Card>
            <p className="text-text-secondary">Loading...</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="p-8">
        <h2>VPN Configuration</h2>
        <div className="space-y-6">
          <Card>
            <h3>VPN Status</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">VPN Active</p>
                <p className={`text-base ${enabled ? "text-green-brand" : "text-text-muted"}`}>
                  {enabled ? "Connected" : "Disconnected"}
                </p>
              </div>
              <button
                onClick={handleToggle}
                className={`w-11 h-6 rounded-full transition-colors ${
                  enabled ? "bg-green-brand" : "bg-border-standard"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </Card>
          <Card>
            <h3>VPN Provider</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Provider Type</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-1.5 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary"
                >
                  <option value="wireguard">WireGuard</option>
                  <option value="openvpn">OpenVPN</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">
                  {provider === "wireguard" ? "WireGuard Config" : "OpenVPN Config"}
                </label>
                <textarea
                  value={config}
                  onChange={(e) => setConfig(e.target.value)}
                  placeholder={
                    provider === "wireguard"
                      ? "[Interface]\nPrivateKey = ...\nAddress = ...\n\n[Peer]\nPublicKey = ...\nEndpoint = ...\nAllowedIPs = 0.0.0.0/0"
                      : "Paste OpenVPN config file..."
                  }
                  className="w-full px-3 py-2 bg-bg-deep border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-muted h-32 resize-none"
                />
              </div>
              {error && <p className="text-red-brand text-sm">{error}</p>}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : saved ? "Saved!" : "Save VPN Config"}
              </Button>
            </div>
          </Card>
          <Card>
            <h3>Quick Setup</h3>
            <p className="text-text-secondary text-sm mb-4">
              {provider === "wireguard"
                ? "Generate a WireGuard config on your phone app and paste it here."
                : "Export an OpenVPN config from your provider and paste it here."}
            </p>
            <Button variant="secondary" onClick={() => setProvider("wireguard")}>
              Use WireGuard
            </Button>
            <Button variant="secondary" onClick={() => setProvider("openvpn")} className="ml-2">
              Use OpenVPN
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}