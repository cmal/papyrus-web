import type { ConnectionConfig, HealthState, OperationName } from "./types";

const STORAGE_KEY = "papyrus-web-config";

export function loadConfig(): ConnectionConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConnectionConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: ConnectionConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export class PapyrusApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class PapyrusClient {
  constructor(private config: ConnectionConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    // 只有在真正持有 token 时才附带 Authorization 头。
    // auto 模式（baseUrl/token 均为空）下由本机代理注入 daemon token，
    // 此处若发一个空的 `Bearer ` 会顶掉浏览器为本站缓存的 HTTP Basic 凭据，
    // 导致站点置于 basic auth 闸门之后时 /health、/api/* 恒定 401。
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.config.token) {
      headers.authorization = `Bearer ${this.config.token}`;
    }
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...((init.headers ?? {}) as Record<string, string>),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new PapyrusApiError(body?.error ?? `HTTP ${res.status}`, res.status);
    }
    return body as T;
  }

  health(): Promise<HealthState> {
    return this.request<HealthState>("/health");
  }

  async operations(): Promise<OperationName[]> {
    const body = await this.request<{ operations: OperationName[] }>("/api/v1/ops");
    return body.operations;
  }

  async call<Input extends Record<string, unknown>, Output>(
    operation: string,
    input: Input,
  ): Promise<Output> {
    const body = await this.request<{ result: Output }>("/api/v1/ops", {
      method: "POST",
      body: JSON.stringify({ op: operation, input }),
    });
    return body.result;
  }
}

let client: PapyrusClient | null = null;

export function getClient(): PapyrusClient | null {
  if (client) return client;
  const config = loadConfig();
  if (!config) return null;
  client = new PapyrusClient(config);
  return client;
}

export function resetClient() {
  client = null;
}

export function setClient(config: ConnectionConfig) {
  saveConfig(config);
  client = new PapyrusClient(config);
}
