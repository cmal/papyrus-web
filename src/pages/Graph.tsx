import { useQuery } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore } from "@/store/project";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanNode {
  id: string;
  title: string;
  status: string;
  state: string;
  layer: number;
  active: boolean;
  prerequisiteIds: string[];
  successorIds: string[];
}

interface PlanResult {
  nodes: PlanNode[];
  layers: string[][];
  cycleIds: string[];
}

const STATUS_COLORS: Record<string, string> = {
  "todo": "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  "in-progress": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  "review": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "rejected": "bg-red-500/15 text-red-600 dark:text-red-400",
  "done": "bg-green-500/15 text-green-600 dark:text-green-400",
  "canceled": "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

export default function GraphPage() {
  const client = useConnectionStore((s) => s.client);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, isLoading, error } = useQuery<PlanResult>({
    queryKey: ["tasks.plan", currentProject?.projectRoot],
    queryFn: () => client!.call("tasks.plan", { project_root: currentProject!.projectRoot }),
    enabled: !!client && !!currentProject,
  });

  const nodes = data?.nodes || [];
  const layers = data?.layers || [];
  const cycleIds = data?.cycleIds || [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading task graph...</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Network size={28} className="text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Select a project to view task graph</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          The task dependency graph is scoped to a project. Use the project selector in the header to choose a project.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Task Graph</h2>
          <Badge variant="secondary">{nodes.length} tasks · {layers.length} layers</Badge>
        </div>
        {cycleIds.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle size={14} />
            {cycleIds.length} cycle(s) detected
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Network size={48} className="mb-4 opacity-30" />
            <p>No tasks in this project.</p>
          </div>
        ) : (
          <div className="flex gap-6">
            {layers.map((layerIds, layerIdx) => (
              <div key={layerIdx} className="w-72 shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Layer {layerIdx}</Badge>
                  <span className="text-xs text-muted-foreground">{layerIds.length} tasks</span>
                </div>
                <div className="space-y-2">
                  {layerIds.map((id) => {
                    const node = nodeById.get(id);
                    if (!node) return null;
                    return (
                      <Card
                        key={id}
                        className={cn(
                          "cursor-pointer transition-shadow hover:shadow-md",
                          node.active && "ring-2 ring-primary",
                          cycleIds.includes(id) && "border-destructive",
                        )}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-xs font-medium">{node.title}</p>
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[node.status])}>
                              {node.status}
                            </Badge>
                          </div>
                          {(node.prerequisiteIds.length > 0 || node.successorIds.length > 0) && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                              {node.prerequisiteIds.length > 0 && (
                                <span>← {node.prerequisiteIds.length} dep{node.prerequisiteIds.length > 1 ? "s" : ""}</span>
                              )}
                              {node.successorIds.length > 0 && (
                                <span>{node.successorIds.length} blocked →</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {layerIdx < layers.length - 1 && (
                  <div className="mt-4 flex justify-center text-muted-foreground">
                    <ArrowRight size={16} className="opacity-40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
