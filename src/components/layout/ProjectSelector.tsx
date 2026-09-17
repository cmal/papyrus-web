import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore, type ProjectRef } from "@/store/project";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FolderGit2, Globe, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function extractProjects(data: any): ProjectRef[] {
  if (Array.isArray(data)) return data;
  if (data?.projects) return data.projects;
  if (data?.items) return data.items;
  if (data?.result) return extractProjects(data.result);
  return [];
}

export function ProjectSelector() {
  const client = useConnectionStore((s) => s.client);
  const { currentProject, setCurrentProject } = useProjectStore();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["projects.list"],
    queryFn: () => client!.call("projects.list", {}),
    enabled: !!client,
  });

  const projects = extractProjects(data);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border-2 font-medium",
            currentProject
              ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
              : "border-muted-foreground/20",
          )}
        >
          {currentProject ? (
            <>
              <FolderGit2 size={14} className="shrink-0" />
              <span className="max-w-[140px] truncate">{currentProject.name}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">project</Badge>
            </>
          ) : (
            <>
              <Globe size={14} className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Global</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">all projects</Badge>
            </>
          )}
          <ChevronDown size={14} className="shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Project Context</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setCurrentProject(null)}>
          <Globe size={14} className="mr-2" />
          <span>Global (no project)</span>
          {!currentProject && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {projects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">No registered projects. Register one in the Projects page.</div>
        ) : (
          projects.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => setCurrentProject(p)}>
              <FolderGit2 size={14} className="mr-2" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{p.projectRoot}</div>
              </div>
              {currentProject?.id === p.id && <Check size={14} className="ml-2 shrink-0" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
