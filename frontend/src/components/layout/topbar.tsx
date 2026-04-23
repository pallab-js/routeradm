"use client";

import { Wifi, Shield, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";

interface TopBarProps {
  onRefresh?: () => void;
}

export function TopBar({ onRefresh }: TopBarProps) {
  const { status, token } = useStore();
  const isConnected = !!token && !!status;

  return (
    <header className="h-9 border-b border-border-subtle bg-bg-page px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-brand" : "bg-red-brand"}`} />
          <span className="text-[13px] text-text-secondary">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        {status?.wan_ip && (
          <span className="text-[11px] text-text-muted font-mono">
            WAN: {status.wan_ip}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {status && (
          <>
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Wifi size={12} />
              <span>{status.clients} clients</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-text-muted">
              <Shield size={12} className={status.vpn_active ? "text-green-brand" : ""} />
              <span>{status.vpn_active ? "VPN Active" : "VPN Off"}</span>
            </div>
          </>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-bg-elevated rounded-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} className="text-text-muted" />
          </button>
        )}
      </div>
    </header>
  );
}