"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { invoke } from "@tauri-apps/api/core";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const { piUrl, token, setCredentials } = useStore();
  const [url, setUrl] = useState(piUrl.replace("http://", ""));
  const [currentToken, setCurrentToken] = useState(token);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const fullUrl = url.startsWith("http") ? url : `http://${url}`;
    setCredentials(fullUrl, currentToken);
    
    try {
      await invoke("save_credentials", { url: fullUrl, token: currentToken });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save credentials:", error);
    }
  };

  return (
    <>
      <TopBar />
      <div className="p-8">
        <h2>Settings</h2>
        <div className="space-y-6">
          <Card>
            <h3>Router Credentials</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Router IP/URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="192.168.1.1"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">API Token</label>
                <Input
                  type="password"
                  value={currentToken}
                  onChange={(e) => setCurrentToken(e.target.value)}
                  placeholder="Enter your API token"
                />
              </div>
              <Button onClick={handleSave}>
                {saved ? "Saved!" : "Save Credentials"}
              </Button>
            </div>
          </Card>
          <Card>
            <h3>mDNS Discovery</h3>
            <p className="text-text-secondary text-sm mb-4">
              Auto-discover routers on your local network using mDNS.
            </p>
            <Button variant="secondary" onClick={async () => {
              try {
                const devices = await invoke<string[]>("discover_devices");
                alert(`Found devices: ${devices.join(", ") || "None"}`);
              } catch (error) {
                console.error("Discovery failed:", error);
              }
            }}>
              Discover Routers
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}