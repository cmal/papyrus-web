import { useConnectionStore } from "@/store/connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Power } from "lucide-react";

export function Header() {
  const { health, config, checkHealth, disconnect } = useConnectionStore();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Papyrus Web</h1>
        {health && (
          <Badge variant={health.ok ? "success" : "destructive"}>
            {health.ok ? `v${health.version}` : "disconnected"}
          </Badge>
        )}
        {health?.schema.state === "migrationRequired" && (
          <Badge variant="warning">Migration Required</Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{config?.baseUrl}</span>
        <Button variant="ghost" size="icon" onClick={() => checkHealth()} title="Refresh">
          <RefreshCw size={16} />
        </Button>
        <Button variant="ghost" size="icon" onClick={disconnect} title="Disconnect">
          <Power size={16} />
        </Button>
      </div>
    </header>
  );
}
