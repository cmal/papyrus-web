import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function ConnectPage() {
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1");
  const [port, setPort] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const { connect, connecting } = useConnectionStore();
  const navigate = useNavigate();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const url = port ? `${baseUrl}:${port}` : baseUrl;
    try {
      await connect({ baseUrl: url, token });
      navigate("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen size={24} />
          </div>
          <CardTitle className="text-xl">Connect to Papyrus</CardTitle>
          <CardDescription>
            Enter your local Papyrus daemon connection details. The port and token are stored in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">$XDG_RUNTIME_DIR/papyrus/</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Daemon URL</Label>
              <Input id="baseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://127.0.0.1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input id="port" value={port} onChange={(e) => setPort(e.target.value)} placeholder="e.g. 48291" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token" type="password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={connecting || !token}>
              {connecting ? "Connecting..." : "Connect"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
