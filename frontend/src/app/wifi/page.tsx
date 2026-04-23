"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WifiPage() {
  const { piUrl, token } = useStore();
  const { fetchWifi, saveWifi } = usePi();
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [channel, setChannel] = useState(6);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    
    async function loadWifi() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      const data = await fetchWifi();
      if (mounted && data) {
        setSsid(data.ssid);
        setPassword(data.password);
        setChannel(data.channel);
        setEnabled(data.enabled);
        setLoading(false);
      } else if (mounted) {
        setLoading(false);
      }
    }
    
    loadWifi();
    return () => { mounted = false; };
  }, [piUrl, token, fetchWifi]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const success = await saveWifi({ ssid, password, channel, enabled });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError("Failed to save WiFi settings");
    }
  };

  const channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="p-8">
          <h2>Wi-Fi Configuration</h2>
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
        <h2>Wi-Fi Configuration</h2>
        <div className="space-y-6">
          <Card>
            <h3>Access Point Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Enable Wi-Fi</label>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    enabled ? "bg-green-brand" : "bg-border-standard"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Network Name (SSID)</label>
                <Input
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="MyTravelRouter"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Wi-Fi password"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-page border border-border-standard rounded-[6px] text-text-primary focus:outline-none focus:border-border-prominent"
                >
                  {channels.map((ch) => (
                    <option key={ch} value={ch}>
                      Channel {ch}
                    </option>
                  ))}
                </select>
              </div>
              {error && <p className="text-red-brand text-sm">{error}</p>}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
              </Button>
            </div>
          </Card>
          <Card>
            <h3>LAN Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">LAN IP Address</label>
                <Input value="192.168.1.1" disabled className="opacity-60" />
              </div>
              <p className="text-text-secondary text-sm">
                LAN settings are managed on the router. Connect to router-admin for LAN configuration.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}