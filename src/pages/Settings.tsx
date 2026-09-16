import { useState } from "react";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Power } from "lucide-react";

export default function SettingsPage() {
  const { config, health, connect, disconnect, connecting } = useConnectionStore();
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl || "http://127.0.0.1");
  const [token, setToken] = useState(config?.token || "");
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await connect({ baseUrl, token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-3">
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle>Daemon Connection</CardTitle>
              <CardDescription>Connection details for the local Papyrus daemon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={health?.ok ? "success" : "destructive"}>
                  {health?.ok ? "Connected" : "Disconnected"}
                </Badge>
                {health && <span className="text-xs text-muted-foreground">v{health.version}</span>}
              </div>
              {health?.schema && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Schema:</span>
                  <Badge variant={health.schema.state === "ok" ? "success" : "warning"}>{health.schema.state}</Badge>
                </div>
              )}
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Daemon URL</Label>
                  <Input id="baseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Token</Label>
                  <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} type="password" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={connecting || !token}>
                    <Save size={14} className="mr-1" /> {connecting ? "Connecting..." : "Save & Reconnect"}
                  </Button>
                  {config && (
                    <Button type="button" variant="outline" onClick={disconnect}>
                      <Power size={14} className="mr-1" /> Disconnect
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>Papyrus Web — a web UI for @danypops/papyrus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Exposes all Papyrus daemon operations (tasks, docs, rules, playbooks, notes, projects, graph) through a browser interface.</p>
              <p>The daemon runs locally with an authenticated loopback API. Find the port and token in <code className="rounded bg-muted px-1 py-0.5 text-xs">$XDG_RUNTIME_DIR/papyrus/</code></p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
