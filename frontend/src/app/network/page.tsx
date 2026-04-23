"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Network, Cpu, MemoryStick, Clock, RefreshCw } from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function NetworkPage() {
  const { piUrl, token } = useStore();
  const { fetchNetworkStats } = usePi();
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState(0);
  const [rxHistory, setRxHistory] = useState<number[]>([]);
  const [txHistory, setTxHistory] = useState<number[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadStats() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }

      const stats = await fetchNetworkStats();
      if (mounted && stats) {
        setRxHistory(prev => [...prev.slice(-29), stats.rx_rate]);
        setTxHistory(prev => [...prev.slice(-29), stats.tx_rate]);
        setLoading(false);
      } else if (mounted) {
        setLoading(false);
      }
    }

    async function measureLatency() {
      if (!piUrl || !token) return;
      try {
        const start = performance.now();
        await fetch("ping", { method: "HEAD" });
        setLatency(Math.round(performance.now() - start));
      } catch {
        setLatency(0);
      }
    }

    loadStats();
    measureLatency();
    
    const interval = setInterval(() => {
      loadStats();
      measureLatency();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [piUrl, token]);

  const stats = useStore(state => state.networkStats);

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="p-8">
          <h2>Network Monitoring</h2>
          <Card>
            <p className="text-text-secondary">Loading...</p>
          </Card>
        </div>
      </>
    );
  }

  const maxRate = Math.max(...rxHistory, ...txHistory, 1);

  return (
    <>
      <TopBar />
      <div className="p-8">
        <h2>Network Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Network className="text-green-brand" size={20} />
              <span className="text-text-secondary text-sm">Download</span>
            </div>
            <p className="text-xl font-mono">{stats ? formatBytes(stats.rx_bytes) : "N/A"}</p>
            <p className="text-sm text-text-secondary">{stats ? formatBytes(stats.rx_rate) + "/s" : ""}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Network className="text-blue-brand" size={20} />
              <span className="text-text-secondary text-sm">Upload</span>
            </div>
            <p className="text-xl font-mono">{stats ? formatBytes(stats.tx_bytes) : "N/A"}</p>
            <p className="text-sm text-text-secondary">{stats ? formatBytes(stats.tx_rate) + "/s" : ""}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-green-brand" size={20} />
              <span className="text-text-secondary text-sm">Uptime</span>
            </div>
            <p className="text-xl font-mono">{stats ? formatUptime(stats.wan_uptime) : "N/A"}</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="text-green-brand" size={20} />
              <span className="text-text-secondary text-sm">Latency</span>
            </div>
            <p className="text-xl font-mono">{latency > 0 ? `${latency}ms` : "N/A"}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <h3>Download Bandwidth</h3>
            <div className="h-48 flex items-end gap-1">
              {rxHistory.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 bg-green-brand rounded-t"
                  style={{ height: `${(val / maxRate) * 100}%` }}
                  title={formatBytes(val) + "/s"}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-text-secondary">
              <span>Download</span>
              <span>Total: {stats ? formatBytes(stats.rx_bytes) : "0"}</span>
            </div>
          </Card>
          <Card>
            <h3>Upload Bandwidth</h3>
            <div className="h-48 flex items-end gap-1">
              {txHistory.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-brand rounded-t"
                  style={{ height: `${(val / maxRate) * 100}%` }}
                  title={formatBytes(val) + "/s"}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-text-secondary">
              <span>Upload</span>
              <span>Total: {stats ? formatBytes(stats.tx_bytes) : "0"}</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="text-green-brand" size={20} />
              <span className="text-text-secondary text-sm">CPU Usage</span>
            </div>
            <div className="h-4 bg-bg-page rounded-full overflow-hidden">
              <div
                className="h-full bg-green-brand transition-all"
                style={{ width: `${stats?.cpu_usage || 0}%` }}
              />
            </div>
            <p className="mt-2 text-right">{stats?.cpu_usage?.toFixed(1) || 0}%</p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <MemoryStick className="text-green-brand" size={20} />
              <span className="text-text-secondary text-sm">Memory Usage</span>
            </div>
            <div className="h-4 bg-bg-page rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-brand/70 transition-all"
                style={{ width: `${stats?.memory_usage || 0}%` }}
              />
            </div>
            <p className="mt-2 text-right">{stats?.memory_usage?.toFixed(1) || 0}%</p>
          </Card>
        </div>
      </div>
    </>
  );
}