import { create } from "zustand";
import type { ConnectionConfig, HealthState } from "@/lib/types";
import { getClient, loadConfig, resetClient, setClient, type PapyrusClient } from "@/lib/papyrus";

interface ConnectionState {
  config: ConnectionConfig | null;
  client: PapyrusClient | null;
  health: HealthState | null;
  connecting: boolean;
  error: string | null;
  connect: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => void;
  checkHealth: () => Promise<void>;
  init: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  config: null,
  client: null,
  health: null,
  connecting: false,
  error: null,

  init: () => {
    const config = loadConfig();
    if (config) {
      const client = getClient();
      set({ config, client });
      get().checkHealth();
    }
  },

  connect: async (config) => {
    set({ connecting: true, error: null });
    try {
      setClient(config);
      const client = getClient()!;
      const health = await client.health();
      set({ config, client, health, connecting: false });
    } catch (err) {
      resetClient();
      set({ connecting: false, error: err instanceof Error ? err.message : String(err), config: null, client: null });
      throw err;
    }
  },

  disconnect: () => {
    resetClient();
    localStorage.removeItem("papyrus-web-config");
    set({ config: null, client: null, health: null, error: null });
  },

  checkHealth: async () => {
    const { client } = get();
    if (!client) return;
    try {
      const health = await client.health();
      set({ health });
    } catch (err) {
      set({ health: null, error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
