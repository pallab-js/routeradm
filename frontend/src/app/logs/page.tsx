"use client";

import { useState, useEffect } from "react";
import { usePi } from "@/hooks/usePi";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, AlertTriangle, Bug, RefreshCw, Search } from "lucide-react";

function getLogIcon(level: string) {
  switch (level.toLowerCase()) {
    case "error":
      return <AlertCircle size={16} className="text-red-brand" />;
    case "warn":
      return <AlertTriangle size={16} className="text-yellow-brand" />;
    case "info":
      return <Info size={16} className="text-blue-brand" />;
    case "debug":
      return <Bug size={16} className="text-purple-brand" />;
    default:
      return <Info size={16} className="text-text-secondary" />;
  }
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleString();
}

export default function LogsPage() {
  const { piUrl, token } = useStore();
  const { fetchLogs, pingRouter, refresh } = usePi();
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState("");
  const [latency, setLatency] = useState(0);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLogs() {
      if (!piUrl || !token) {
        if (mounted) setLoading(false);
        return;
      }
      await fetchLogs(limit);
      if (mounted) setLoading(false);
    }

    loadLogs();
    return () => { mounted = false; };
  }, [piUrl, token, limit, fetchLogs]);

  const logs = useStore(state => state.logs);
  const filteredLogs = filter
    ? logs.filter(
        log =>
          log.message.toLowerCase().includes(filter.toLowerCase()) ||
          log.source.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  const handlePing = async () => {
    setPinging(true);
    const ms = await pingRouter();
    setLatency(ms);
    setPinging(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchLogs(limit);
    setLoading(false);
  };

  const errorLogs = logs.filter(l => l.level === "error").length;
  const warnLogs = logs.filter(l => l.level === "warn").length;

  if (loading && logs.length === 0) {
    return (
      <>
        <TopBar onRefresh={refresh} />
        <div className="p-8">
          <h2>Logs & Diagnostics</h2>
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
        <h2>Logs & Diagnostics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <p className="text-text-secondary text-sm">Total Logs</p>
            <p className="text-2xl">{logs.length}</p>
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Errors</p>
            <p className="text-2xl text-red-brand">{errorLogs}</p>
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Warnings</p>
            <p className="text-2xl text-yellow-brand">{warnLogs}</p>
          </Card>
          <Card>
            <p className="text-text-secondary text-sm">Router Latency</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl">{pinging ? "..." : latency > 0 ? `${latency}ms` : "N/A"}</p>
              <Button variant="ghost" onClick={handlePing} disabled={pinging}>
                <RefreshCw size={16} className={pinging ? "animate-spin" : ""} />
              </Button>
            </div>
          </Card>
        </div>

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3>Router Logs</h3>
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="px-3 py-1 bg-bg-page border border-border-standard rounded text-sm"
              >
                <option value={50}>50 logs</option>
                <option value={100}>100 logs</option>
                <option value={200}>200 logs</option>
                <option value={500}>500 logs</option>
              </select>
              <Button variant="secondary" onClick={handleRefresh}>
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter logs..."
              className="w-full pl-10 pr-4 py-2 bg-bg-page border border-border-standard rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-prominent"
            />
          </div>
          <div className="bg-bg-page rounded-lg overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-deep">
                <tr className="text-left text-text-secondary">
                  <th className="p-2">Time</th>
                  <th className="p-2">Level</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, i) => (
                  <tr key={i} className="border-t border-border-subtle">
                    <td className="p-2 font-mono text-xs">{formatTimestamp(log.timestamp)}</td>
                    <td className="p-2">{getLogIcon(log.level)}</td>
                    <td className="p-2 text-text-secondary">{log.source}</td>
                    <td className="p-2">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <p className="p-4 text-center text-text-secondary">No logs found</p>
            )}
          </div>
        </Card>

        <Card>
          <h3>Connection Diagnostics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-bg-page rounded-lg">
              <p className="text-sm text-text-secondary mb-2">API Connectivity</p>
              <p className={latency > 0 ? "text-green-brand" : "text-red-brand"}>
                {latency > 0 ? "Connected" : "Disconnected"}
              </p>
            </div>
            <div className="p-4 bg-bg-page rounded-lg">
              <p className="text-sm text-text-secondary mb-2">Response Time</p>
              <p className={latency < 100 ? "text-green-brand" : latency < 500 ? "text-yellow-brand" : "text-red-brand"}>
                {latency > 0 ? `${latency}ms` : "N/A"}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}