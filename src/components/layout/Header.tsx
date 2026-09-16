import { useConnectionStore } from "@/store/connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "@/components/layout/ProjectSelector";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Power } from "lucide-react";

export function Header() {
  const { health, config, checkHealth, disconnect } = useConnectionStore();

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Papyrus</h1>
        <Separator orientation="vertical" className="h-6" />
        <ProjectSelector />
        {health && (
          <Badge variant={health.ok ? "success" : "destructive"}>
            {health.ok ? `v${health.version}` : "disconnected"}
          </Badge>
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
