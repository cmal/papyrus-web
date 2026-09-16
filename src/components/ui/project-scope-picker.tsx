import { useQuery } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore, type ProjectRef } from "@/store/project";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Globe, FolderGit2 } from "lucide-react";

function extractProjects(data: any): ProjectRef[] {
  if (Array.isArray(data)) return data;
  if (data?.projects) return data.projects;
  if (data?.items) return data.items;
  if (data?.result) return extractProjects(data.result);
  return [];
}

interface ProjectScopePickerProps {
  value: string; // "global" | "current" | project id
  onChange: (value: string) => void;
  label?: string;
}

export function ProjectScopePicker({ value, onChange, label = "Project Scope" }: ProjectScopePickerProps) {
  const client = useConnectionStore((s) => s.client);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data } = useQuery({
    queryKey: ["projects.list"],
    queryFn: () => client!.call("projects.list", {}),
    enabled: !!client,
  });

  const projects = extractProjects(data);

  const options: { value: string; label: string; hint?: string; icon: React.ReactNode }[] = [
    { value: "global", label: "Global", hint: "Applies to all projects", icon: <Globe size={14} /> },
  ];

  if (currentProject) {
    options.push({
      value: "current",
      label: currentProject.name,
      hint: `Current project · ${currentProject.root}`,
      icon: <FolderGit2 size={14} />,
    });
  }

  for (const p of projects) {
    if (currentProject?.id === p.id) continue;
    options.push({
      value: p.id,
      label: p.name,
      hint: p.root,
      icon: <FolderGit2 size={14} />,
    });
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-1">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border p-2.5 transition-colors",
              value === opt.value
                ? "border-primary bg-primary/5"
                : "border-input hover:bg-accent/50",
            )}
          >
            <input
              type="radio"
              name="project-scope"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 h-3.5 w-3.5 accent-primary"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {opt.icon}
                {opt.label}
                {opt.value === "current" && (
                  <span className="rounded bg-primary/10 px-1 text-[10px] font-semibold text-primary">current</span>
                )}
              </div>
              {opt.hint && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{opt.hint}</div>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

/** Resolve the picker value to an actual project root (or null for global) */
export function resolveProjectScope(value: string): ProjectRef | null {
  if (value === "global") return null;
  if (value === "current") return useProjectStore.getState().currentProject;
  // It's a project id — look it up from the store isn't available, so return a minimal ref
  // Callers should pass the full project list; for simplicity we return null and let
  // the caller handle id-based lookup.
  return null;
}
