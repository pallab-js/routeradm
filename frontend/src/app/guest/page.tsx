"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wifi, Users, Lock, Unlock, Shield } from "lucide-react";

export default function GuestPage() {
  const { piUrl, token } = useStore();
  const { fetchGuestNetwork, saveGuestNetwork, refresh } = usePi();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [channel, setChannel] = useState(6);
  const [enabled, setEnabled] = useState(false);
  const [isolated, setIsolated] = useState(true);
  const [maxClients, setMaxClients] = useState(10);

  useEffect(() => {
    let mounted = true;

    async function loadGuest() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      const data = await fetchGuestNetwork();
      if (mounted && data) {
        setSsid(data.ssid);
        setPassword(data.password);
        setChannel(data.channel);
        setEnabled(data.enabled);
        setIsolated(data.isolated);
        setMaxClients(data.max_clients);
        setLoading(false);
      } else if (mounted) {
        setLoading(false);
      }
    }

    loadGuest();
    return () => { mounted = false; };
  }, [piUrl, token, fetchGuestNetwork]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const success = await saveGuestNetwork({
      ssid,
      password,
      channel,
      enabled,
      isolated,
      max_clients: maxClients,
    });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError("Failed to save guest network");
    }
  };

  if (loading) {
    return (
      <>
        <TopBar onRefresh={refresh} />
        <div className="p-8">
          <h2>Guest Network</h2>
          <Card>
            <p className="text-text-secondary">Loading...</p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar onRefresh={refresh} />
      <div className="p-8">
        <h2>Guest Network</h2>
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Wifi className="text-green-brand" size={20} />
                <h3>Guest Wi-Fi</h3>
              </div>
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
            <p className={`text-sm ${enabled ? "text-green-brand" : "text-text-muted"}`}>
              {enabled ? "Guest network is active" : "Guest network is disabled"}
            </p>
          </Card>

          <Card>
            <h3>Network Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Guest Network Name (SSID)</label>
                <Input
                  value={ssid}
                  onChange={e => setSsid(e.target.value)}
                  placeholder="GuestNetwork"
                  disabled={!enabled}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter guest Wi-Fi password"
                  disabled={!enabled}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">Max Clients</label>
                <Input
                  type="number"
                  value={maxClients}
                  onChange={e => setMaxClients(Number(e.target.value))}
                  min={1}
                  max={50}
                  disabled={!enabled}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-bg-page rounded-lg">
                <div className="flex items-center gap-3">
                  {isolated ? <Lock size={20} className="text-green-brand" /> : <Unlock size={20} className="text-yellow-brand" />}
                  <div>
                    <p className="font-medium">Client Isolation</p>
                    <p className="text-sm text-text-secondary">
                      {isolated ? "Clients cannot communicate with each other" : "Clients can see each other"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsolated(!isolated)}
                  disabled={!enabled}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    isolated ? "bg-green-brand" : "bg-yellow-brand"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      isolated ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {error && <p className="text-red-brand text-sm">{error}</p>}
              <Button onClick={handleSave} disabled={saving || !enabled}>
                {saving ? "Saving..." : saved ? "Saved!" : "Save Guest Network"}
              </Button>
            </div>
          </Card>

          <Card>
            <h3>Security Features</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-bg-page rounded-lg">
                <Shield size={20} className="text-green-brand" />
                <div>
                  <p className="font-medium">WAN Access Blocked</p>
                  <p className="text-sm text-text-secondary">
                    Guests cannot access the router admin panel
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-page rounded-lg">
                <Lock size={20} className="text-green-brand" />
                <div>
                  <p className="font-medium">LAN Isolation</p>
                  <p className="text-sm text-text-secondary">
                    {isolated 
                      ? "Guests are isolated from main network" 
                      : "Guests can access main network devices"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-bg-page rounded-lg">
                <Users size={20} className="text-green-brand" />
                <div>
                  <p className="font-medium">Connection Limit</p>
                  <p className="text-sm text-text-secondary">
                    Maximum {maxClients} simultaneous connections
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}