import { useConnectionStore } from "@/store/connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "@/components/layout/ProjectSelector";
import { Separator } from "@/components/ui/separator";
import { Menu, RefreshCw, Power } from "lucide-react";

export function Header({ onOpenNav }: { onOpenNav: () => void }) {
  const { health, config, checkHealth, disconnect } = useConnectionStore();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:gap-3 sm:px-4">
      {/* Only useful below lg, where the sidebar is a drawer. */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onOpenNav}
        title="Open navigation"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </Button>

      {/* The docked sidebar already carries the wordmark, so show it here only when
          the sidebar is collapsed into a drawer. */}
      <div className="hidden items-center gap-3 sm:flex lg:hidden">
        <span className="font-semibold">Papyrus</span>
        <Separator orientation="vertical" className="h-6" />
      </div>

      <ProjectSelector />

      <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
        <span className="hidden max-w-[220px] truncate text-xs text-muted-foreground md:inline">{config?.baseUrl}</span>
        {health && (
          <Badge variant={health.ok ? "success" : "destructive"} className="hidden sm:inline-flex">
            {health.ok ? `v${health.version}` : "disconnected"}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => checkHealth()} title="Refresh">
          <RefreshCw size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={disconnect} title="Disconnect">
          <Power size={16} />
        </Button>
      </div>
    </header>
  );
}
