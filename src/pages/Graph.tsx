import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore } from "@/store/project";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Network, ArrowRight, AlertTriangle, Play, CheckCircle, XCircle, RotateCcw, Focus, Trash2 } from "lucide-react";
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

const STATUS_LABELS: Record<string, string> = {
  "todo": "Todo",
  "in-progress": "In Progress",
  "review": "Review",
  "rejected": "Rejected",
  "done": "Done",
  "canceled": "Canceled",
};

const STATUS_COLORS: Record<string, string> = {
  "todo": "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  "in-progress": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  "review": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "rejected": "bg-red-500/15 text-red-600 dark:text-red-400",
  "done": "bg-green-500/15 text-green-600 dark:text-green-400",
  "canceled": "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

const LIFECYCLE_BUTTONS: Record<string, { op: string; label: string; icon: any }[]> = {
  "todo": [{ op: "tasks.start", label: "Start", icon: Play }, { op: "tasks.cancel", label: "Cancel", icon: XCircle }],
  "in-progress": [{ op: "tasks.submit", label: "Submit", icon: CheckCircle }, { op: "tasks.cancel", label: "Cancel", icon: XCircle }],
  "review": [{ op: "tasks.complete", label: "Complete", icon: CheckCircle }, { op: "tasks.reject", label: "Reject", icon: XCircle }, { op: "tasks.cancel", label: "Cancel", icon: XCircle }],
  "rejected": [{ op: "tasks.retry", label: "Retry", icon: RotateCcw }, { op: "tasks.cancel", label: "Cancel", icon: XCircle }],
  "done": [{ op: "tasks.reopen", label: "Reopen", icon: RotateCcw }],
  "canceled": [{ op: "tasks.reopen", label: "Reopen", icon: RotateCcw }],
};

export default function GraphPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const currentProject = useProjectStore((s) => s.currentProject);
  const [selectedTask, setSelectedTask] = useState<PlanNode | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLabels, setEditLabels] = useState("");
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PlanResult>({
    queryKey: ["tasks.plan", currentProject?.projectRoot],
    queryFn: () => client!.call("tasks.plan", { project_root: currentProject!.projectRoot }),
    enabled: !!client && !!currentProject,
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ op, id }: { op: string; id: string }) => client!.call(op, { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks.plan"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title, body, labels }: { id: string; title?: string; body?: string; labels?: string[] }) =>
      client!.call("tasks.update", { id, title, body, labels, actor: "user", source: "web" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks.plan"] }); setEditing(false); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks.plan"] }); setSelectedTask(null); },
  });

  const lifecycleAction = (op: string, task: PlanNode) => {
    setLifecycleError(null);
    lifecycleMutation.mutate({ op, id: task.id }, { onError: (err: any) => setLifecycleError(err?.message || String(err)) });
  };

  const startEdit = () => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title || "");
    setEditBody("");
    setEditLabels("");
    setEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    const labels = editLabels.split(",").map((l) => l.trim()).filter(Boolean);
    updateMutation.mutate({
      id: selectedTask.id,
      title: editTitle.trim() || undefined,
      body: editBody || undefined,
      labels: labels.length > 0 ? labels : undefined,
    });
  };

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
        <p className="max-w-sm text-sm text-muted-foreground">The task dependency graph is scoped to a project.</p>
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
            <AlertTriangle size={14} />{cycleIds.length} cycle(s) detected
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
                        className={cn("cursor-pointer transition-shadow hover:shadow-md", node.active && "ring-2 ring-primary", cycleIds.includes(id) && "border-destructive")}
                        onClick={() => setSelectedTask(node)}
                      >
                        <CardContent className="p-3">
                          <p className="line-clamp-2 text-xs font-medium">{node.title}</p>
                          <div className="mt-2 flex items-center gap-1">
                            <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[node.status])}>{STATUS_LABELS[node.status] || node.status}</Badge>
                          </div>
                          {(node.prerequisiteIds.length > 0 || node.successorIds.length > 0) && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                              {node.prerequisiteIds.length > 0 && <span>← {node.prerequisiteIds.length} dep{node.prerequisiteIds.length > 1 ? "s" : ""}</span>}
                              {node.successorIds.length > 0 && <span>{node.successorIds.length} blocked →</span>}
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

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => { if (!o) { setSelectedTask(null); setEditing(false); setLifecycleError(null); } }}>
        <DialogContent className="max-w-2xl">
          {selectedTask && (
            editing ? (
              <form onSubmit={handleSaveEdit}>
                <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Task title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Body</Label>
                    <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} placeholder="Description (optional)" rows={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Labels (comma-separated)</Label>
                    <Input value={editLabels} onChange={(e) => setEditLabels(e.target.value)} placeholder="label1, label2" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DialogTitle>{selectedTask.title}</DialogTitle>
                      <Badge className={STATUS_COLORS[selectedTask.status]}>{STATUS_LABELS[selectedTask.status] || selectedTask.status}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(LIFECYCLE_BUTTONS[selectedTask.status] || []).map(({ op, label, icon: Icon }) => (
                      <Button key={op} size="sm" variant="outline" onClick={() => lifecycleAction(op, selectedTask)} disabled={lifecycleMutation.isPending}>
                        <Icon size={14} className="mr-1" />{label}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => lifecycleAction("tasks.focus", selectedTask)} disabled={lifecycleMutation.isPending}>
                      <Focus size={14} className="mr-1" />Focus
                    </Button>
                  </div>
                  {lifecycleError && (
                    <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{lifecycleError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{selectedTask.id}</code></div>
                    <div><span className="text-muted-foreground">Layer:</span> {selectedTask.layer}</div>
                    <div><span className="text-muted-foreground">Prerequisites:</span> {selectedTask.prerequisiteIds.length}</div>
                    <div><span className="text-muted-foreground">Blocking:</span> {selectedTask.successorIds.length}</div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(selectedTask.id)}>
                    <Trash2 size={14} className="mr-1" /> Remove
                  </Button>
                </DialogFooter>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
