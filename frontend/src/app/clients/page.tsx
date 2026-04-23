"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, Tablet, Wifi, Ban } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getDeviceIcon(hostname?: string) {
  if (!hostname) return <Monitor size={20} className="text-text-secondary" />;
  const h = hostname.toLowerCase();
  if (h.includes("phone") || h.includes("android") || h.includes("iphone")) return <Smartphone size={20} className="text-blue-brand" />;
  if (h.includes("ipad") || h.includes("tablet")) return <Tablet size={20} className="text-purple-brand" />;
  return <Monitor size={20} className="text-text-secondary" />;
}

export default function ClientsPage() {
  const { piUrl, token } = useStore();
  const { fetchClients, blockClient, refresh } = usePi();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      await fetchClients();
      if (mounted) setLoading(false);
    }

    loadClients();
    return () => { mounted = false; };
  }, [piUrl, token, fetchClients]);

  const clients = useStore(state => state.clients);

  const handleBlock = async (mac: string, blocked: boolean) => {
    await blockClient(mac, blocked);
    await fetchClients();
  };

  const activeClients = clients.filter(c => !c.blocked);
  const blockedClients = clients.filter(c => c.blocked);

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="p-8">
          <h2>Connected Devices</h2>
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
        <h2>Connected Devices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <p className="text-text-secondary text-sm">Total Devices</p>
            <p className="text-xl font-mono">{clients.length}</p>
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Active</p>
            <p className="text-xl text-green-brand">{activeClients.length}</p>
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Blocked</p>
            <p className="text-xl text-red-brand">{blockedClients.length}</p>
          </Card>
        </div>

        <Card className="mb-6">
          <h3>Active Devices</h3>
          {activeClients.length === 0 ? (
            <p className="text-text-secondary">No active devices</p>
          ) : (
            <div className="space-y-3">
              {activeClients.map(client => (
                <div
                  key={client.mac}
                  className="flex items-center justify-between p-3 bg-bg-page rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(client.hostname)}
                    <div>
                      <p className="font-medium">
                        {client.name || client.hostname || "Unknown Device"}
                      </p>
                      <p className="text-sm text-text-secondary">{client.ip}</p>
                      <p className="text-xs text-text-muted font-mono">{client.mac}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-green-brand">↓</span> {formatBytes(client.rx_bytes)}
                      </p>
                      <p className="text-sm">
                        <span className="text-blue-brand">↑</span> {formatBytes(client.tx_bytes)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBlock(client.mac, true)}
                        className="p-2 hover:bg-bg-deep rounded text-red-brand"
                      >
                        <Ban size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {blockedClients.length > 0 && (
          <Card>
            <h3 className="text-red-brand">Blocked Devices</h3>
            <div className="space-y-3">
              {blockedClients.map(client => (
                <div
                  key={client.mac}
                  className="flex items-center justify-between p-3 bg-bg-page rounded-lg opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <Wifi size={20} className="text-red-brand" />
                    <div>
                      <p className="font-medium">{client.name || client.mac}</p>
                      <p className="text-sm text-text-secondary">{client.ip}</p>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={() => handleBlock(client.mac, false)}>
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}