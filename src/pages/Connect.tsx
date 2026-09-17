import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function ConnectPage() {
  const { health, config, connecting, error, autoConnect, connect, disconnect } = useConnectionStore();
  const navigate = useNavigate();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!health && !connecting && !error) {
      autoConnect();
    }
  }, [health, connecting, error, autoConnect]);

  useEffect(() => {
    if (health?.ok) {
      navigate("/tasks");
    }
  }, [health, navigate]);

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");
    try {
      await connect({ baseUrl, token });
      navigate("/tasks");
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Connection failed");
    }
  };

  const isAutoMode = config?.baseUrl === "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen size={24} />
          </div>
          <CardTitle className="text-xl">Papyrus Web</CardTitle>
          <CardDescription>Connecting to your local Papyrus daemon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {connecting ? (
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            ) : health?.ok ? (
              <CheckCircle2 size={20} className="text-green-500" />
            ) : (
              <AlertCircle size={20} className="text-destructive" />
            )}
            <div className="flex-1">
              {connecting && <p className="text-sm font-medium">Connecting...</p>}
              {health?.ok && <p className="text-sm font-medium">Connected — v{health.version}</p>}
              {!connecting && !health?.ok && (
                <p className="text-sm font-medium">Daemon not reachable</p>
              )}
              {isAutoMode && !health?.ok && (
                <p className="text-xs text-muted-foreground">Auto mode — via local proxy</p>
              )}
              {!isAutoMode && (
                <p className="text-xs text-muted-foreground">{config?.baseUrl || "not configured"}</p>
              )}
            </div>
            {health?.ok && <Badge variant="success">Ready</Badge>}
          </div>

          {/* Error / help */}
          {!health?.ok && !connecting && (
            <div className="space-y-3">
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error || "Could not connect to the Papyrus daemon."}
              </div>
              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">Make sure the daemon is running:</p>
                <code className="block rounded bg-background px-2 py-1">papyrus service install</code>
                <code className="mt-1 block rounded bg-background px-2 py-1">papyrus serve</code>
                <p className="mt-2">The web app auto-reads the port/token from <code className="rounded bg-background px-1">$XDG_RUNTIME_DIR/papyrus/</code></p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => autoConnect()} disabled={connecting}>
                <RefreshCw size={14} className="mr-2" /> Retry connection
              </Button>
            </div>
          )}

          {/* Advanced manual config */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Advanced: manual daemon connection
            </button>
            {showAdvanced && (
              <form onSubmit={handleManualConnect} className="mt-3 space-y-3 rounded-lg border p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="baseUrl" className="text-xs">Daemon URL</Label>
                  <Input id="baseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://127.0.0.1:PORT" className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="token" className="text-xs">Token</Label>
                  <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token" type="password" className="h-8 text-xs" />
                </div>
                {manualError && <p className="text-xs text-destructive">{manualError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1" disabled={!baseUrl || !token}>Connect</Button>
                  {config && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { disconnect(); autoConnect(); }}>
                      Reset to auto
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
