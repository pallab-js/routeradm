"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Wifi, 
  Shield, 
  Activity, 
  Users, 
  FileText, 
  Shield as Firewall, 
  Home,
  PanelLeftClose,
  Settings2,
  Router
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/network/", label: "Network", icon: Activity },
  { href: "/wifi/", label: "Wi-Fi", icon: Wifi },
  { href: "/guest/", label: "Guest", icon: Home },
  { href: "/clients/", label: "Clients", icon: Users },
  { href: "/vpn/", label: "VPN", icon: Shield },
  { href: "/firewall/", label: "Firewall", icon: Firewall },
  { href: "/logs/", label: "Logs", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <nav className={cn(
      "h-screen bg-bg-deep border-r border-border-subtle flex flex-col transition-all duration-150",
      sidebarOpen ? "w-56" : "w-14"
    )}>
      <div className={cn(
        "flex items-center gap-2 px-3 py-3",
        sidebarOpen ? "px-4" : "justify-center px-2"
      )}>
        <div className="w-6 h-6 bg-green-brand rounded-sm flex items-center justify-center flex-shrink-0">
          <Router size={16} className="text-bg-deep" />
        </div>
        {sidebarOpen && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-text-primary leading-tight">TravelRouter</span>
            <span className="text-xs text-text-muted">Admin Panel</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium transition-colors rounded-md",
                isActive
                  ? "text-text-primary bg-bg-elevated"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
                !sidebarOpen && "justify-center px-2"
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <Icon size={18} />
              {sidebarOpen && item.label}
            </Link>
          );
        })}
      </div>
      
      <div className={cn(
        "flex flex-col gap-1 px-2 py-2 mt-auto"
      )}>
        <Link
          href="/settings/"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium transition-colors rounded-md",
            pathname === "/settings/"
              ? "text-text-primary bg-bg-elevated"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
            !sidebarOpen && "justify-center px-2"
          )}
          title={!sidebarOpen ? "Settings" : undefined}
        >
          <Settings2 size={18} />
          {sidebarOpen && "Settings"}
        </Link>
        
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 text-sm text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors rounded-md",
            !sidebarOpen && "justify-center px-2"
          )}
          title={!sidebarOpen ? "Expand (Cmd+B)" : "Collapse (Cmd+B)"}
        >
          <PanelLeftClose size={18} />
          {sidebarOpen && "Collapse"}
        </button>
      </div>
    </nav>
  );
}