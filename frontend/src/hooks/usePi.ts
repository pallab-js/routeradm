import { invoke } from "@tauri-apps/api/core";
import { useStore, RouterStatus, WifiSettings, VpnSettings, NetworkStats, ClientDevice, FirewallRule, PortForward, GuestNetwork, RouterLog } from "@/lib/store";

export function usePi() {
  const { piUrl, token, setStatus, setWifiSettings, setVpnSettings, setNetworkStats, setClients, setFirewallRules, setPortForwards, setGuestNetwork, setLogs } = useStore();

  const refresh = async (): Promise<RouterStatus | null> => {
    if (!piUrl || !token) {
      return null;
    }
    try {
      const data = await invoke<RouterStatus>("fetch_status", { url: piUrl, token });
      setStatus(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch status:", error);
      return null;
    }
  };

  const fetchWifi = async (): Promise<WifiSettings | null> => {
    if (!piUrl || !token) {
      return null;
    }
    try {
      const data = await invoke<WifiSettings>("fetch_wifi_settings", { url: piUrl, token });
      setWifiSettings(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch WiFi settings:", error);
      return null;
    }
  };

  const saveWifi = async (settings: WifiSettings): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("save_wifi_settings", { url: piUrl, token, settings });
      setWifiSettings(settings);
      return true;
    } catch (error) {
      console.error("Failed to save WiFi settings:", error);
      return false;
    }
  };

  const fetchVpn = async (): Promise<VpnSettings | null> => {
    if (!piUrl || !token) {
      return null;
    }
    try {
      const data = await invoke<VpnSettings>("fetch_vpn_settings", { url: piUrl, token });
      setVpnSettings(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch VPN settings:", error);
      return null;
    }
  };

  const saveVpn = async (settings: VpnSettings): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("save_vpn_settings", { url: piUrl, token, settings });
      setVpnSettings(settings);
      return true;
    } catch (error) {
      console.error("Failed to save VPN settings:", error);
      return false;
    }
  };

  const toggleVpn = async (enabled: boolean): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("toggle_vpn", { url: piUrl, token, enabled });
      return true;
    } catch (error) {
      console.error("Failed to toggle VPN:", error);
      return false;
    }
  };

  const fetchNetworkStats = async (): Promise<NetworkStats | null> => {
    if (!piUrl || !token) {
      return null;
    }
    try {
      const data = await invoke<NetworkStats>("fetch_network_stats", { url: piUrl, token });
      setNetworkStats(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch network stats:", error);
      return null;
    }
  };

  const fetchClients = async (): Promise<ClientDevice[]> => {
    if (!piUrl || !token) {
      return [];
    }
    try {
      const data = await invoke<ClientDevice[]>("fetch_clients", { url: piUrl, token });
      setClients(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      return [];
    }
  };

  const blockClient = async (mac: string, blocked: boolean): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("block_client", { url: piUrl, token, mac, blocked });
      return true;
    } catch (error) {
      console.error("Failed to block/unblock client:", error);
      return false;
    }
  };

  const renameClient = async (mac: string, name: string): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("rename_client", { url: piUrl, token, mac, name });
      return true;
    } catch (error) {
      console.error("Failed to rename client:", error);
      return false;
    }
  };

  const fetchFirewallRules = async (): Promise<FirewallRule[]> => {
    if (!piUrl || !token) {
      return [];
    }
    try {
      const data = await invoke<FirewallRule[]>("fetch_firewall_rules", { url: piUrl, token });
      setFirewallRules(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch firewall rules:", error);
      return [];
    }
  };

  const addFirewallRule = async (rule: FirewallRule): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("add_firewall_rule", { url: piUrl, token, rule });
      return true;
    } catch (error) {
      console.error("Failed to add firewall rule:", error);
      return false;
    }
  };

  const deleteFirewallRule = async (ruleId: string): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("delete_firewall_rule", { url: piUrl, token, ruleId });
      return true;
    } catch (error) {
      console.error("Failed to delete firewall rule:", error);
      return false;
    }
  };

  const fetchPortForwards = async (): Promise<PortForward[]> => {
    if (!piUrl || !token) {
      return [];
    }
    try {
      const data = await invoke<PortForward[]>("fetch_port_forwards", { url: piUrl, token });
      setPortForwards(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch port forwards:", error);
      return [];
    }
  };

  const addPortForward = async (forward: PortForward): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("add_port_forward", { url: piUrl, token, forward });
      return true;
    } catch (error) {
      console.error("Failed to add port forward:", error);
      return false;
    }
  };

  const deletePortForward = async (forwardId: string): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("delete_port_forward", { url: piUrl, token, forwardId });
      return true;
    } catch (error) {
      console.error("Failed to delete port forward:", error);
      return false;
    }
  };

  const fetchGuestNetwork = async (): Promise<GuestNetwork | null> => {
    if (!piUrl || !token) {
      return null;
    }
    try {
      const data = await invoke<GuestNetwork>("fetch_guest_network", { url: piUrl, token });
      setGuestNetwork(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch guest network:", error);
      return null;
    }
  };

  const saveGuestNetwork = async (settings: GuestNetwork): Promise<boolean> => {
    if (!piUrl || !token) {
      return false;
    }
    try {
      await invoke("save_guest_network", { url: piUrl, token, settings });
      setGuestNetwork(settings);
      return true;
    } catch (error) {
      console.error("Failed to save guest network:", error);
      return false;
    }
  };

  const fetchLogs = async (limit: number = 100): Promise<RouterLog[]> => {
    if (!piUrl || !token) {
      return [];
    }
    try {
      const data = await invoke<RouterLog[]>("fetch_logs", { url: piUrl, token, limit });
      setLogs(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      return [];
    }
  };

  const pingRouter = async (): Promise<number> => {
    if (!piUrl || !token) {
      return 0;
    }
    try {
      return await invoke<number>("ping_router", { url: piUrl, token });
    } catch (error) {
      console.error("Failed to ping router:", error);
      return 0;
    }
  };

  return {
    refresh,
    fetchWifi,
    saveWifi,
    fetchVpn,
    saveVpn,
    toggleVpn,
    fetchNetworkStats,
    fetchClients,
    blockClient,
    renameClient,
    fetchFirewallRules,
    addFirewallRule,
    deleteFirewallRule,
    fetchPortForwards,
    addPortForward,
    deletePortForward,
    fetchGuestNetwork,
    saveGuestNetwork,
    fetchLogs,
    pingRouter,
  };
}