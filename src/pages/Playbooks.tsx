import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore } from "@/store/project";
import { ProjectScopePicker } from "@/components/ui/project-scope-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Play, BookOpen, Loader2 } from "lucide-react";

interface Playbook {
  id: string;
  name: string;
  title: string;
  body?: string;
  trigger?: string;
  steps?: unknown[];
  status: string;
  [key: string]: unknown;
}

function extractList(data: any): Playbook[] {
  if (Array.isArray(data)) return data;
  if (data?.playbooks) return data.playbooks;
  if (data?.items) return data.items;
  if (data?.result) return extractList(data.result);
  return [];
}

export default function PlaybooksPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [invokeOpen, setInvokeOpen] = useState(false);
  const [selected, setSelected] = useState<Playbook | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [newSteps, setNewSteps] = useState("");
  const [projectScope, setProjectScope] = useState("current");
  const [invokeArgs, setInvokeArgs] = useState("{}");
  const [invokeResult, setInvokeResult] = useState<any>(null);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, isLoading } = useQuery({
    queryKey: ["playbooks.list"],
    queryFn: () => client!.call("playbooks.list", {}),
    enabled: !!client,
  });

  const playbooks = extractList(data);

  const createMutation = useMutation({
    mutationFn: (input: any) => client!.call("playbooks.create", input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playbooks.list"] }); setCreateOpen(false); setNewTitle(""); setNewTrigger(""); setNewSteps(""); setProjectScope("current"); },
  });

  const invokeMutation = useMutation({
    mutationFn: (input: any) => client!.call("playbooks.invoke", input),
    onSuccess: (result) => { setInvokeResult(result); queryClient.invalidateQueries({ queryKey: ["tasks.list"] }); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["playbooks.list"] }); setSelected(null); },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    let steps: unknown | undefined;
    if (newSteps.trim()) {
      try { steps = JSON.parse(newSteps); } catch { steps = newSteps; }
    }
    const scope = projectScope;
    createMutation.mutate({ title: newTitle, trigger: newTrigger || undefined, steps }, {
      onSuccess: (result: any) => {
        const id = result?.id || result;
        if (id && scope === "current" && currentProject) {
          client!.call("playbooks.add_project", { id, project: currentProject.name }).catch(() => {});
        }
      },
    });
  };

  const handleInvoke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    let args = {};
    try { args = JSON.parse(invokeArgs); } catch { /* keep empty */ }
    invokeMutation.mutate({ id: selected.id, arguments: args });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Playbooks</h2>
          <Badge variant="secondary">{playbooks.length}</Badge>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} className="mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Playbook</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus /></div>
              <div className="space-y-2"><Label>Trigger</Label><Input value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} placeholder="What triggers this playbook" /></div>
              <div className="space-y-2">
                <Label>Steps (JSON array or text)</Label>
                <Textarea value={newSteps} onChange={(e) => setNewSteps(e.target.value)} rows={6} placeholder='["Step 1", "Step 2"] or {"kind":"doc",...}' />
              </div>
              <ProjectScopePicker value={projectScope} onChange={setProjectScope} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!newTitle.trim()}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((pb) => (
            <Card key={pb.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelected(pb); setInvokeResult(null); setInvokeOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <BookOpen size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pb.title || pb.name}</p>
                    {pb.trigger && <p className="mt-1 text-xs text-muted-foreground">Trigger: {pb.trigger}</p>}
                    {Array.isArray(pb.steps) && <p className="mt-0.5 text-xs text-muted-foreground">{pb.steps.length} steps</p>}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{pb.status}</Badge>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setSelected(pb); setInvokeResult(null); setInvokeOpen(true); }}>
                    <Play size={12} className="mr-1" /> Invoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {playbooks.length === 0 && <div className="col-span-full text-center text-muted-foreground">No playbooks yet.</div>}
        </div>
      </div>

      {/* Invoke Dialog */}
      <Dialog open={invokeOpen} onOpenChange={(o) => !o && setInvokeOpen(false)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>Invoke: {selected.title || selected.name}</DialogTitle></DialogHeader>
              <form onSubmit={handleInvoke} className="space-y-4">
                <div className="space-y-2">
                  <Label>Arguments (JSON)</Label>
                  <Textarea value={invokeArgs} onChange={(e) => setInvokeArgs(e.target.value)} rows={4} className="font-mono text-xs" />
                </div>
                <Button type="submit" disabled={invokeMutation.isPending}>
                  {invokeMutation.isPending ? <><Loader2 size={14} className="mr-1 animate-spin" />Running...</> : <><Play size={14} className="mr-1" />Run Playbook</>}
                </Button>
              </form>
              {invokeResult && (
                <div className="rounded-md border bg-muted/50 p-4">
                  <Label className="mb-2 block">Run Result</Label>
                  <pre className="max-h-60 overflow-auto text-xs">{JSON.stringify(invokeResult, null, 2)}</pre>
                </div>
              )}
              <DialogFooter>
                <Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(selected.id)}><Trash2 size={14} className="mr-1" />Delete Playbook</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
