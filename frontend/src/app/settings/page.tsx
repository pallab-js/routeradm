"use client";

import { useState, useEffect } from "react";
import { useStore, Router } from "@/lib/store";
import { api } from "@/lib/api";
import { invoke } from "@tauri-apps/api/core";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Network, Loader2, Globe, Wifi, Activity } from "lucide-react";

export default function SettingsPage() {
  const { piUrl, token, routers, activeRouterId, setCredentials, addRouter, removeRouter, setActiveRouter } = useStore();
  const [urlDraft, setUrlDraft] = useState(piUrl.replace(/^https?:\/\//, ""));
  const [tokenDraft, setTokenDraft] = useState(token);
  const [saved, setSaved] = useState(false);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newToken, setNewToken] = useState("");

  const [discovering, setDiscovering] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<string[]>([]);
  const [discoveryError, setDiscoveryError] = useState("");

  const [backendSettings, setBackendSettings] = useState<Record<string, string> | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [countryCode, setCountryCode] = useState("US");
  const [logLevel, setLogLevel] = useState("INFO");

  const activeRouter = routers.find(r => r.id === activeRouterId);

  useEffect(() => {
    if (!piUrl || !token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettingsLoading(true);
    api.fetchSettings(piUrl, token).then(data => {
      setBackendSettings(data);
      setCountryCode(data.wifi_country_code || "US");
      setLogLevel(data.log_level || "INFO");
      setSettingsLoading(false);
    }).catch(() => setSettingsLoading(false));
  }, [piUrl, token]);

  const handleSaveCredentials = async () => {
    const fullUrl = urlDraft.startsWith("http") ? urlDraft : `http://${urlDraft}`;
    setCredentials(fullUrl, tokenDraft);
    try {
      await invoke("save_credentials", { url: fullUrl, token: tokenDraft });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save credentials:", error);
    }
  };

  const handleAddRouter = () => {
    if (!newName.trim() || !newUrl.trim() || !newToken.trim()) return;
    const fullUrl = newUrl.startsWith("http") ? newUrl : `http://${newUrl}`;
    const router: Router = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      url: fullUrl,
      token: newToken.trim(),
    };
    addRouter(router);
    setNewName("");
    setNewUrl("");
    setNewToken("");
  };

  const handleSetActive = (router: Router) => {
    setActiveRouter(router.id);
    setCredentials(router.url, router.token || token);
    setUrlDraft(router.url.replace(/^https?:\/\//, ""));
    setTokenDraft(router.token || token);
  };

  const handleRemoveRouter = (id: string) => {
    if (id === activeRouterId) {
      setCredentials("http://192.168.1.1", "");
    }
    removeRouter(id);
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    setDiscoveryError("");
    setDiscoveredDevices([]);
    try {
      const devices = await invoke<string[]>("discover_devices");
      setDiscoveredDevices(devices);
    } catch (error) {
      setDiscoveryError("Discovery failed. Make sure mDNS is enabled on your network.");
      console.error("Discovery failed:", error);
    }
    setDiscovering(false);
  };

  const handleSelectDiscovered = (device: string) => {
    setNewUrl(device);
    setDiscoveredDevices([]);
  };

  const handleSaveSettings = async () => {
    const success = await api.saveSettings(piUrl, token, {
      wifi_country_code: countryCode,
      log_level: logLevel,
    }).then(r => r.success).catch(() => false);
    if (success) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    }
  };

  return (
    <>
      <TopBar />
      <div className="p-8">
        <h2>Settings</h2>
        <div className="space-y-6">

          <Card>
            <h3 className="flex items-center gap-2">
              <Globe size={18} />
              Router List
            </h3>
            {routers.length === 0 ? (
              <p className="text-text-secondary text-sm mb-4">
                No routers saved. Add one below.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {routers.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-bg-page rounded-lg border border-border-standard"
                  >
                    <div className="flex items-center gap-3">
                      {r.id === activeRouterId ? (
                        <Check size={16} className="text-green-brand" />
                      ) : (
                        <div className="w-4" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-text-secondary">{r.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.id !== activeRouterId && (
                        <Button variant="ghost" size="sm" onClick={() => handleSetActive(r)}>
                          Set Active
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveRouter(r.id)}>
                        <Trash2 size={14} className="text-red-brand" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h4 className="text-sm font-medium mb-3">Add Router</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Name (e.g. Home Router)"
              />
              <Input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="IP/URL (e.g. 192.168.1.1)"
              />
              <Input
                type="password"
                value={newToken}
                onChange={e => setNewToken(e.target.value)}
                placeholder="API Token"
              />
              <Button onClick={handleAddRouter} disabled={!newName || !newUrl || !newToken}>
                <Plus size={16} />
                Add
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2">
              <Activity size={18} />
              {activeRouter ? `Active: ${activeRouter.name}` : "Active Router"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Router IP/URL</label>
                <Input
                  value={urlDraft}
                  onChange={e => setUrlDraft(e.target.value)}
                  placeholder="192.168.1.1"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">API Token</label>
                <Input
                  type="password"
                  value={tokenDraft}
                  onChange={e => setTokenDraft(e.target.value)}
                  placeholder="Enter your API token"
                />
              </div>
              <Button onClick={handleSaveCredentials}>
                {saved ? "Saved!" : "Save to Keychain"}
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="flex items-center gap-2">
              <Network size={18} />
              mDNS Discovery
            </h3>
            <p className="text-text-secondary text-sm mb-4">
              Auto-discover routers on your local network using mDNS.
            </p>
            <Button variant="secondary" onClick={handleDiscover} disabled={discovering}>
              {discovering ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Discover Routers
            </Button>
            {discoveryError && (
              <p className="text-red-brand text-sm mt-2">{discoveryError}</p>
            )}
            {discoveredDevices.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-text-secondary">Found devices:</p>
                {discoveredDevices.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-bg-page rounded border border-border-standard cursor-pointer hover:border-border-prominent"
                    onClick={() => handleSelectDiscovered(d)}
                  >
                    <span className="text-sm font-mono">{d}</span>
                    <Button variant="ghost" size="sm">Select</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="flex items-center gap-2">
              <Wifi size={18} />
              Router Configuration
            </h3>
            {settingsLoading ? (
              <p className="text-text-secondary">Loading settings...</p>
            ) : backendSettings ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">WiFi Country Code</label>
                    <Input
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="US"
                      maxLength={2}
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Affects allowed WiFi channels. Changing requires hostapd restart.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-2">Log Level</label>
                    <select
                      value={logLevel}
                      onChange={e => setLogLevel(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-bg-page border border-border-standard rounded text-text-primary focus:outline-none focus:border-green-brand"
                    >
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-text-secondary">
                  <div>
                    <span className="font-medium">WiFi Interface:</span> {backendSettings.wifi_interface}
                  </div>
                  <div>
                    <span className="font-medium">WAN Interface:</span> {backendSettings.wan_interface}
                  </div>
                  <div>
                    <span className="font-medium">API Host:</span> {backendSettings.api_host}
                  </div>
                  <div>
                    <span className="font-medium">API Port:</span> {backendSettings.api_port}
                  </div>
                </div>
                <Button onClick={handleSaveSettings}>
                  {settingsSaved ? "Saved!" : "Save Configuration"}
                </Button>
              </div>
            ) : (
              <p className="text-text-secondary text-sm">
                Connect to a router to view and edit configuration.
              </p>
            )}
          </Card>

        </div>
      </div>
    </>
  );
}