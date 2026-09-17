import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore } from "@/store/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Play, CheckCircle, Pause, XCircle, RotateCcw, Focus, Trash2, Eye, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

const TASK_STATUSES = ["todo", "in-progress", "review", "rejected", "done", "canceled"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

const STATUS_LABELS: Record<TaskStatus, string> = {
  "todo": "Todo",
  "in-progress": "In Progress",
  "review": "Review",
  "rejected": "Rejected",
  "done": "Done",
  "canceled": "Canceled",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  "todo": "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  "in-progress": "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  "review": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "rejected": "bg-red-500/15 text-red-600 dark:text-red-400",
  "done": "bg-green-500/15 text-green-600 dark:text-green-400",
  "canceled": "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

interface Task {
  id: string;
  name: string;
  title: string;
  body?: string;
  status: TaskStatus;
  labels: string[];
  focus?: boolean;
  projectRoot?: string | null;
  createdAt?: string;
  [key: string]: unknown;
}

function taskListResponse(data: any): Task[] {
  if (Array.isArray(data)) return data;
  if (data?.tasks) return data.tasks;
  if (data?.items) return data.items;
  if (data?.result) return taskListResponse(data.result);
  return [];
}

export default function TasksPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const [view, setView] = useState<"board" | "list">("board");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks.list", currentProject?.projectRoot],
    queryFn: () => client!.call("tasks.list", { project_root: currentProject!.projectRoot }),
    enabled: !!client && !!currentProject,
  });

  const tasks = taskListResponse(data);

  const createMutation = useMutation({
    mutationFn: (input: any) => client!.call("tasks.create", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks.list"] });
      setCreateOpen(false);
      setNewTitle("");
      setNewBody("");
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ op, id }: { op: string; id: string }) => client!.call(op, { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks.list"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks.list"] });
      setSelectedTask(null);
    },
  });

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editLabels, setEditLabels] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ id, title, body, labels }: { id: string; title?: string; body?: string; labels?: string[] }) =>
      client!.call("tasks.update", { id, title, body, labels, actor: "user", source: "web" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks.list"] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title || selectedTask.name || "");
    setEditBody(selectedTask.body || "");
    setEditLabels(selectedTask.labels?.join(", ") || "");
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentProject) return;
    createMutation.mutate({ title: newTitle, body: newBody || undefined, project_root: currentProject.projectRoot });
  };

  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const lifecycleAction = (op: string, task: Task) => {
    setLifecycleError(null);
    lifecycleMutation.mutate(
      { op, id: task.id },
      { onError: (err: any) => setLifecycleError(err?.message || String(err)) },
    );
  };

  // Allowed lifecycle actions per status
  const LIFECYCLE_BUTTONS: Record<string, { op: string; label: string; icon: any }[]> = {
    "todo": [
      { op: "tasks.start", label: "Start", icon: Play },
      { op: "tasks.cancel", label: "Cancel", icon: XCircle },
    ],
    "in-progress": [
      { op: "tasks.submit", label: "Submit", icon: CheckCircle },
      { op: "tasks.cancel", label: "Cancel", icon: XCircle },
    ],
    "review": [
      { op: "tasks.complete", label: "Complete", icon: CheckCircle },
      { op: "tasks.reject", label: "Reject", icon: XCircle },
      { op: "tasks.cancel", label: "Cancel", icon: XCircle },
    ],
    "rejected": [
      { op: "tasks.retry", label: "Retry", icon: RotateCcw },
      { op: "tasks.cancel", label: "Cancel", icon: XCircle },
    ],
    "done": [
      { op: "tasks.reopen", label: "Reopen", icon: RotateCcw },
    ],
    "canceled": [
      { op: "tasks.reopen", label: "Reopen", icon: RotateCcw },
    ],
  };

  const renderTaskCard = (task: Task) => (
    <Card
      key={task.id}
      className={cn("cursor-pointer transition-shadow hover:shadow-md", task.focus && "ring-2 ring-primary")}
      onClick={() => setSelectedTask(task)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{task.title || task.name}</p>
            {task.body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.body}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded p-1 hover:bg-muted"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); lifecycleAction("tasks.focus", task); }}>
                <Focus size={14} className="mr-2" /> Focus
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(LIFECYCLE_BUTTONS[task.status] || []).map(({ op, label, icon: Icon }) => (
                <DropdownMenuItem key={op} onClick={(e) => { e.stopPropagation(); lifecycleAction(op, task); }}>
                  <Icon size={14} className="mr-2" /> {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); removeMutation.mutate(task.id); }} className="text-destructive">
                <Trash2 size={14} className="mr-2" /> Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[task.status])}>{STATUS_LABELS[task.status]}</Badge>
          {task.focus && <Badge variant="info" className="text-[10px]">focus</Badge>}
          {task.labels?.slice(0, 2).map((l) => (
            <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading tasks...</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error.message}</div>;

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <ListTodo size={28} className="text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Select a project to view tasks</h3>
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          Tasks are scoped to a project. Use the project selector in the header to choose a project, or register one in the Projects page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "board" | "list")}>
            <TabsList>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={16} className="mr-1" /> New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Description (optional)" rows={4} />
                </div>
                {currentProject && (
                  <div className="rounded-md bg-primary/5 px-3 py-2 text-xs text-primary">
                    Will be created in project: <span className="font-medium">{currentProject.name}</span>
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || !newTitle.trim() || !currentProject}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {view === "board" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {TASK_STATUSES.map((status) => {
              const columnTasks = tasks.filter((t) => t.status === status);
              return (
                <div key={status} className="w-72 shrink-0">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{STATUS_LABELS[status]}</span>
                    <Badge variant="outline" className="text-xs">{columnTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {columnTasks.map(renderTaskCard)}
                    {columnTasks.length === 0 && (
                      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">No tasks</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(renderTaskCard)}
            {tasks.length === 0 && <div className="text-center text-muted-foreground">No tasks yet. Create one to get started.</div>}
          </div>
        )}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(o) => { if (!o) { setSelectedTask(null); setEditing(false); setLifecycleError(null); } }}>
        <DialogContent className="max-w-2xl">
          {selectedTask && (
            editing ? (
              <form onSubmit={handleSaveEdit}>
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
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
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DialogTitle>{selectedTask.title || selectedTask.name}</DialogTitle>
                      <Badge className={STATUS_COLORS[selectedTask.status]}>{STATUS_LABELS[selectedTask.status]}</Badge>
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
                  {selectedTask.body && (
                    <div className="rounded-md bg-muted p-4">
                      <p className="whitespace-pre-wrap text-sm">{selectedTask.body}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{selectedTask.id}</code></div>
                    <div><span className="text-muted-foreground">Project:</span> {selectedTask.projectRoot || "—"}</div>
                    <div><span className="text-muted-foreground">Labels:</span> {selectedTask.labels?.join(", ") || "—"}</div>
                    <div><span className="text-muted-foreground">Created:</span> {selectedTask.createdAt || "—"}</div>
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
