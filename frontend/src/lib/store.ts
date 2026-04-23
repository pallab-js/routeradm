import { create } from 'zustand';

export interface RouterStatus {
  wan_ip?: string;
  clients: number;
  vpn_active: boolean;
  ap_ssid: string;
  signal_rssi: number;
}

export interface WifiSettings {
  ssid: string;
  password: string;
  channel: number;
  enabled: boolean;
}

export interface VpnSettings {
  provider: string;
  config: string;
  enabled: boolean;
}

export interface NetworkStats {
  rx_bytes: number;
  tx_bytes: number;
  rx_rate: number;
  tx_rate: number;
  wan_uptime: number;
  cpu_usage: number;
  memory_usage: number;
}

export interface ClientDevice {
  mac: string;
  ip: string;
  hostname?: string;
  name?: string;
  connected_at: number;
  rx_bytes: number;
  tx_bytes: number;
  blocked: boolean;
}

export interface FirewallRule {
  id: string;
  port: number;
  protocol: string;
  action: string;
  source_ip?: string;
  enabled: boolean;
  description?: string;
}

export interface PortForward {
  id: string;
  external_port: number;
  internal_ip: string;
  internal_port: number;
  protocol: string;
  enabled: boolean;
  description?: string;
}

export interface GuestNetwork {
  ssid: string;
  password: string;
  enabled: boolean;
  isolated: boolean;
  max_clients: number;
}

export interface RouterLog {
  timestamp: number;
  level: string;
  source: string;
  message: string;
}

export interface Router {
  id: string;
  name: string;
  url: string;
  status?: RouterStatus;
}

interface StoreState {
  piUrl: string;
  token: string;
  sidebarOpen: boolean;
  status: RouterStatus | null;
  wifiSettings: WifiSettings | null;
  vpnSettings: VpnSettings | null;
  networkStats: NetworkStats | null;
  clients: ClientDevice[];
  firewallRules: FirewallRule[];
  portForwards: PortForward[];
  guestNetwork: GuestNetwork | null;
  logs: RouterLog[];
  routers: Router[];
  activeRouterId: string | null;
  setCredentials: (url: string, token: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setStatus: (data: RouterStatus) => void;
  setWifiSettings: (data: WifiSettings) => void;
  setVpnSettings: (data: VpnSettings) => void;
  setNetworkStats: (data: NetworkStats) => void;
  setClients: (clients: ClientDevice[]) => void;
  setFirewallRules: (rules: FirewallRule[]) => void;
  setPortForwards: (forwards: PortForward[]) => void;
  setGuestNetwork: (network: GuestNetwork) => void;
  setLogs: (logs: RouterLog[]) => void;
  setRouters: (routers: Router[]) => void;
  setActiveRouter: (id: string | null) => void;
  addRouter: (router: Router) => void;
  removeRouter: (id: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  piUrl: 'http://192.168.1.1',
  token: '',
  sidebarOpen: true,
  status: null,
  wifiSettings: null,
  vpnSettings: null,
  networkStats: null,
  clients: [],
  firewallRules: [],
  portForwards: [],
  guestNetwork: null,
  logs: [],
  routers: [],
  activeRouterId: null,
  setCredentials: (url: string, token: string) => set({ piUrl: url, token }),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setStatus: (data: RouterStatus) => set({ status: data }),
  setWifiSettings: (data: WifiSettings) => set({ wifiSettings: data }),
  setVpnSettings: (data: VpnSettings) => set({ vpnSettings: data }),
  setNetworkStats: (data: NetworkStats) => set({ networkStats: data }),
  setClients: (clients: ClientDevice[]) => set({ clients }),
  setFirewallRules: (rules: FirewallRule[]) => set({ firewallRules: rules }),
  setPortForwards: (forwards: PortForward[]) => set({ portForwards: forwards }),
  setGuestNetwork: (network: GuestNetwork) => set({ guestNetwork: network }),
  setLogs: (logs: RouterLog[]) => set({ logs }),
  setRouters: (routers: Router[]) => set({ routers }),
  setActiveRouter: (id: string | null) => set({ activeRouterId: id }),
  addRouter: (router: Router) => set((state) => ({ 
    routers: [...state.routers, router] 
  })),
  removeRouter: (id: string) => set((state) => ({ 
    routers: state.routers.filter(r => r.id !== id),
    activeRouterId: state.activeRouterId === id ? null : state.activeRouterId
  })),
}));