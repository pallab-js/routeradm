import type {
  RouterStatus, WifiSettings, VpnSettings, NetworkStats,
  ClientDevice, FirewallRule, PortForward, GuestNetwork, RouterLog
} from './store';

const API_TIMEOUT = 10000;

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  baseUrl: string,
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ApiError(res.status, `API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  fetchStatus: (url: string, token: string) =>
    request<RouterStatus>(url, token, '/api/status'),

  fetchNetworkStats: (url: string, token: string) =>
    request<NetworkStats>(url, token, '/api/network/stats'),

  fetchWifiSettings: (url: string, token: string) =>
    request<WifiSettings>(url, token, '/api/wifi'),

  saveWifiSettings: (url: string, token: string, settings: WifiSettings) =>
    request<{ success: boolean }>(url, token, '/api/wifi', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  fetchVpnSettings: (url: string, token: string) =>
    request<VpnSettings>(url, token, '/api/vpn'),

  saveVpnSettings: (url: string, token: string, settings: VpnSettings) =>
    request<{ success: boolean }>(url, token, '/api/vpn', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  toggleVpn: (url: string, token: string, enabled: boolean) =>
    request<{ success: boolean }>(url, token, `/api/vpn/toggle?enabled=${enabled}`, {
      method: 'POST',
    }),

  fetchClients: (url: string, token: string) =>
    request<ClientDevice[]>(url, token, '/api/clients'),

  blockClient: (url: string, token: string, mac: string, blocked: boolean) =>
    request<{ success: boolean }>(url, token, `/api/clients/${mac}/block?blocked=${blocked}`, {
      method: 'POST',
    }),

  renameClient: (url: string, token: string, mac: string, name: string) =>
    request<{ success: boolean }>(url, token, `/api/clients/${mac}/name?name=${encodeURIComponent(name)}`, {
      method: 'PUT',
    }),

  forgetClient: (url: string, token: string, mac: string) =>
    request<{ success: boolean }>(url, token, `/api/clients/${mac}`, {
      method: 'DELETE',
    }),

  fetchFirewallRules: (url: string, token: string) =>
    request<FirewallRule[]>(url, token, '/api/firewall'),

  addFirewallRule: (url: string, token: string, rule: FirewallRule) =>
    request<{ success: boolean }>(url, token, '/api/firewall', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),

  deleteFirewallRule: (url: string, token: string, ruleId: string) =>
    request<{ success: boolean }>(url, token, `/api/firewall/${ruleId}`, {
      method: 'DELETE',
    }),

  fetchPortForwards: (url: string, token: string) =>
    request<PortForward[]>(url, token, '/api/portforward'),

  addPortForward: (url: string, token: string, forward: PortForward) =>
    request<{ success: boolean }>(url, token, '/api/portforward', {
      method: 'POST',
      body: JSON.stringify(forward),
    }),

  deletePortForward: (url: string, token: string, forwardId: string) =>
    request<{ success: boolean }>(url, token, `/api/portforward/${forwardId}`, {
      method: 'DELETE',
    }),

  fetchGuestNetwork: (url: string, token: string) =>
    request<GuestNetwork>(url, token, '/api/guest'),

  saveGuestNetwork: (url: string, token: string, settings: GuestNetwork) =>
    request<{ success: boolean }>(url, token, '/api/guest', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  fetchLogs: (url: string, token: string, limit = 100) =>
    request<RouterLog[]>(url, token, `/api/logs?limit=${limit}`),

  pingRouter: (url: string, token: string) =>
    request<{ pong: boolean; timestamp: number }>(url, token, '/api/ping'),

  fetchSettings: (url: string, token: string) =>
    request<Record<string, string>>(url, token, '/api/settings'),

  saveSettings: (url: string, token: string, settings: Record<string, string>) =>
    request<{ success: boolean }>(url, token, '/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
