"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { usePi } from "@/hooks/usePi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopBar } from "@/components/layout/topbar";
import { Wifi, Shield, Users, Signal, Globe, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { piUrl, token, setCredentials, status } = useStore();
  const { refresh } = usePi();
  const [url, setUrl] = useState(piUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setError("");
    setIsLoading(true);
    setCredentials(url, token);
    
    const result = await refresh();
    if (!result) {
      setError("Failed to connect. Check URL and token.");
    }
    setIsLoading(false);
  };

  return (
    <>
      <TopBar onRefresh={refresh} />
      <div className="p-8 overflow-auto">
        {!token ? (
          <Card className="max-w-md mx-auto mt-20">
            <h2 className="text-xl mb-6">Connect to Router</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Router URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://192.168.1.1"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-2">API Token</label>
                <Input
                  type="password"
                  value={token}
                  onChange={(e) => setCredentials(url, e.target.value)}
                  placeholder="Enter your API token"
                />
              </div>
              {error && <p className="text-red-brand text-sm">{error}</p>}
              <Button onClick={handleConnect} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Connect
              </Button>
            </div>
          </Card>
        ) : status ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Globe className="text-green-brand" size={20} />
                <span className="text-text-secondary text-sm">WAN IP</span>
              </div>
              <p className="text-xl font-mono">{status.wan_ip || "N/A"}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Users className="text-green-brand" size={20} />
                <span className="text-text-secondary text-sm">Clients</span>
              </div>
              <p className="text-xl">{status.clients}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-green-brand" size={20} />
                <span className="text-text-secondary text-sm">VPN</span>
              </div>
              <p className="text-xl">{status.vpn_active ? "Active" : "Inactive"}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Wifi className="text-green-brand" size={20} />
                <span className="text-text-secondary text-sm">AP SSID</span>
              </div>
              <p className="text-xl">{status.ap_ssid}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Signal className="text-green-brand" size={20} />
                <span className="text-text-secondary text-sm">Signal</span>
              </div>
              <p className="text-xl">{status.signal_rssi} dBm</p>
            </Card>
          </div>
        ) : (
          <Card className="max-w-md mx-auto mt-20">
            <p className="text-text-secondary mb-4">Click refresh to fetch router status.</p>
            <Button onClick={refresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Refresh Status
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}