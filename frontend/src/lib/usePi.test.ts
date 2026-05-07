import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStore = {
  piUrl: 'http://192.168.1.1',
  token: 'test-token',
  setStatus: vi.fn(),
  setWifiSettings: vi.fn(),
  setVpnSettings: vi.fn(),
  setNetworkStats: vi.fn(),
  setClients: vi.fn(),
  setFirewallRules: vi.fn(),
  setPortForwards: vi.fn(),
  setGuestNetwork: vi.fn(),
  setLogs: vi.fn(),
};

const mockApi = {
  fetchStatus: vi.fn(),
  fetchNetworkStats: vi.fn(),
  fetchWifiSettings: vi.fn(),
  fetchVpnSettings: vi.fn(),
  fetchClients: vi.fn(),
  fetchFirewallRules: vi.fn(),
  fetchPortForwards: vi.fn(),
  fetchGuestNetwork: vi.fn(),
  fetchLogs: vi.fn(),
  saveWifiSettings: vi.fn(),
  saveVpnSettings: vi.fn(),
  toggleVpn: vi.fn(),
  blockClient: vi.fn(),
  renameClient: vi.fn(),
  addFirewallRule: vi.fn(),
  deleteFirewallRule: vi.fn(),
  addPortForward: vi.fn(),
  deletePortForward: vi.fn(),
  saveGuestNetwork: vi.fn(),
  pingRouter: vi.fn(),
};

vi.mock('@/lib/store', () => ({
  useStore: () => mockStore,
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
}));

describe('usePi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.piUrl = 'http://192.168.1.1';
    mockStore.token = 'test-token';
  });

  it('refresh fetches status and updates store', async () => {
    const status = { wan_ip: '1.2.3.4', clients: 3, vpn_active: false, ap_ssid: 'MyRouter', signal_rssi: -50 };
    mockApi.fetchStatus.mockResolvedValueOnce(status);

    const { usePi } = await import('@/hooks/usePi');
    const result = await usePi().refresh();

    expect(mockApi.fetchStatus).toHaveBeenCalledWith('http://192.168.1.1', 'test-token');
    expect(mockStore.setStatus).toHaveBeenCalledWith(status);
    expect(result).toEqual(status);
  });

  it('refresh returns null when no URL', async () => {
    mockStore.piUrl = '';
    const { usePi } = await import('@/hooks/usePi');
    const result = await usePi().refresh();
    expect(result).toBeNull();
  });

  it('refresh returns null when no token', async () => {
    mockStore.token = '';
    const { usePi } = await import('@/hooks/usePi');
    const result = await usePi().refresh();
    expect(result).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    mockApi.fetchStatus.mockRejectedValueOnce(new Error('Network error'));
    const { usePi } = await import('@/hooks/usePi');
    const result = await usePi().refresh();
    expect(result).toBeNull();
  });

  it('saveWifi calls api and updates store', async () => {
    const settings = { ssid: 'MyNet', password: 'secret', channel: 6, enabled: true };
    mockApi.saveWifiSettings.mockResolvedValueOnce({ success: true });

    const { usePi } = await import('@/hooks/usePi');
    const result = await usePi().saveWifi(settings);

    expect(mockApi.saveWifiSettings).toHaveBeenCalledWith('http://192.168.1.1', 'test-token', settings);
    expect(mockStore.setWifiSettings).toHaveBeenCalledWith(settings);
    expect(result).toBe(true);
  });
});
