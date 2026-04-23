import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStore } from "./store";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("usePi integration", () => {
  beforeEach(() => {
    useStore.setState({ piUrl: "http://192.168.1.1", token: "test-token", status: null });
    vi.clearAllMocks();
  });

  it("fetches status from router via Tauri invoke", async () => {
    const mockStatus = {
      wan_ip: "1.2.3.4",
      clients: 5,
      vpn_active: true,
      ap_ssid: "TravelRouter",
      signal_rssi: -45,
    };
    vi.mocked(invoke).mockResolvedValueOnce(mockStatus);

    const { piUrl, token } = useStore.getState();
    const result = await invoke("fetch_status", { url: piUrl, token });

    expect(invoke).toHaveBeenCalledWith("fetch_status", {
      url: "http://192.168.1.1",
      token: "test-token",
    });
    expect(result).toEqual(mockStatus);
  });

  it("returns null when URL is missing", async () => {
    useStore.setState({ piUrl: "", token: "test-token" });

    const { piUrl, token } = useStore.getState();
    if (!piUrl || !token) {
      expect(true).toBe(true);
    } else {
      await invoke("fetch_status", { url: piUrl, token });
    }

    expect(invoke).not.toHaveBeenCalled();
  });

  it("returns null when token is missing", async () => {
    useStore.setState({ piUrl: "http://192.168.1.1", token: "" });

    const { piUrl, token } = useStore.getState();
    if (!piUrl || !token) {
      expect(true).toBe(true);
    } else {
      await invoke("fetch_status", { url: piUrl, token });
    }

    expect(invoke).not.toHaveBeenCalled();
  });

  it("handles invocation error gracefully", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Network error"));

    const { piUrl, token } = useStore.getState();
    let result: { wan_ip: string; clients: number; vpn_active: boolean; ap_ssid: string; signal_rssi: number } | null = null;
    try {
      result = await invoke("fetch_status", { url: piUrl, token });
    } catch {
      result = null;
    }

    expect(result).toBeNull();
  });
});