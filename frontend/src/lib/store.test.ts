import { describe, it, expect, beforeEach } from "vitest";
import type { RouterStatus } from "./store";

// Mock localStorage before importing the store
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
    get length() { return storage.size; },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
  },
  writable: true,
  configurable: true,
});

const { useStore } = await import("./store");

describe("useStore", () => {
  beforeEach(() => {
    storage.clear();
    useStore.setState({ piUrl: "http://192.168.1.1", token: "", status: null });
  });

  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.piUrl).toBe("http://192.168.1.1");
    expect(state.token).toBe("");
    expect(state.status).toBeNull();
  });

  it("setCredentials updates piUrl and token", () => {
    const { setCredentials } = useStore.getState();
    setCredentials("http://192.168.2.1", "secret123");

    const state = useStore.getState();
    expect(state.piUrl).toBe("http://192.168.2.1");
    expect(state.token).toBe("secret123");
  });

  it("setStatus updates status", () => {
    const status: RouterStatus = {
      wan_ip: "1.2.3.4",
      clients: 5,
      vpn_active: true,
      ap_ssid: "MyNetwork",
      signal_rssi: -45,
    };
    useStore.getState().setStatus(status);

    const state = useStore.getState();
    expect(state.status).toEqual(status);
  });

  it("setStatus can handle null via direct setState", () => {
    useStore.setState((state) => ({ ...state, status: null }));
    expect(useStore.getState().status).toBeNull();
  });
});
