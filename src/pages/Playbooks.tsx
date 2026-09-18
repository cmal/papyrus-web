import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore } from "@/store/project";
import { ProjectScopePicker } from "@/components/ui/project-scope-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Play, BookOpen, Loader2, GripVertical } from "lucide-react";

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

interface StepRow {
  id: string;
  value: string;
}

interface ArgRow {
  id: string;
  key: string;
  value: string;
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
  // Stable per-row ids: rows hold <Input>s, and an index key makes React reuse the wrong
  // DOM node when a middle row is removed, so the surviving inputs show shifted values.
  const rowIdRef = useRef(0);
  const nextRowId = () => `row-${++rowIdRef.current}`;
  const [newSteps, setNewSteps] = useState<StepRow[]>(() => [{ id: nextRowId(), value: "" }]);
  const [projectScope, setProjectScope] = useState("current");
  const [invokeArgs, setInvokeArgs] = useState<ArgRow[]>(() => [{ id: nextRowId(), key: "", value: "" }]);
  const [invokeResult, setInvokeResult] = useState<any>(null);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, isLoading } = useQuery({
    queryKey: ["playbooks.list"],
    queryFn: () => client!.call("playbooks.list", {}),
    enabled: !!client,
  });

  const playbooks = extractList(data);

  // list 接口可能不返回 body/steps，点击时用 artifact.show 取完整详情
  const { data: selectedDetail } = useQuery({
    queryKey: ["artifact.show", selected?.id],
    queryFn: () => client!.call("artifact.show", { id: selected!.id }),
    enabled: !!client && !!selected,
  });
  const selectedFull: Playbook | null = selectedDetail ? ({ ...selected, ...(selectedDetail as object) } as Playbook) : selected;

  const createMutation = useMutation({
    mutationFn: (input: any) => client!.call("playbooks.create", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbooks.list"] });
      setCreateOpen(false);
      setNewTitle("");
      setNewTrigger("");
      setNewSteps([{ id: nextRowId(), value: "" }]);
      setProjectScope("current");
    },
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
    const steps = newSteps.map((s) => s.value.trim()).filter(Boolean);
    const scope = projectScope;
    createMutation.mutate(
      { title: newTitle, trigger: newTrigger || undefined, steps: steps.length ? steps : undefined },
      {
        onSuccess: (result: any) => {
          const id = result?.id || result;
          if (id && scope === "current" && currentProject) {
            client!.call("playbooks.add_project", { id, project: currentProject.name }).catch(() => {});
          }
        },
      },
    );
  };

  const handleInvoke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const args: Record<string, string> = {};
    for (const row of invokeArgs) {
      if (row.key.trim()) args[row.key.trim()] = row.value;
    }
    invokeMutation.mutate({ id: selected.id, arguments: args });
  };

  const addStep = () => setNewSteps([...newSteps, { id: nextRowId(), value: "" }]);
  const removeStep = (id: string) => setNewSteps(newSteps.filter((s) => s.id !== id));
  const updateStep = (id: string, v: string) =>
    setNewSteps(newSteps.map((s) => (s.id === id ? { ...s, value: v } : s)));

  const addArg = () => setInvokeArgs([...invokeArgs, { id: nextRowId(), key: "", value: "" }]);
  const removeArg = (id: string) => setInvokeArgs(invokeArgs.filter((r) => r.id !== id));
  const updateArg = (id: string, field: "key" | "value", v: string) =>
    setInvokeArgs(invokeArgs.map((r) => (r.id === id ? { ...r, [field]: v } : r)));

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
                <Label>Steps</Label>
                <div className="space-y-2">
                  {newSteps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-2">
                      <GripVertical size={14} className="shrink-0 text-muted-foreground" />
                      <Input
                        value={step.value}
                        onChange={(e) => updateStep(step.id, e.target.value)}
                        placeholder={`Step ${i + 1}`}
                      />
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeStep(step.id)} disabled={newSteps.length <= 1}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addStep}><Plus size={14} className="mr-1" />Add Step</Button>
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
            <Card key={pb.id} className="cursor-pointer hover:shadow-md" onClick={() => { setSelected(pb); setInvokeResult(null); setInvokeArgs([{ id: nextRowId(), key: "", value: "" }]); setInvokeOpen(true); }}>
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
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setSelected(pb); setInvokeResult(null); setInvokeArgs([{ id: nextRowId(), key: "", value: "" }]); setInvokeOpen(true); }}>
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
          {selectedFull && (
            <>
              <DialogHeader><DialogTitle>Invoke: {selectedFull.title || selectedFull.name}</DialogTitle></DialogHeader>

              {/* Playbook 完整详情 */}
              <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div className="col-span-2"><span className="text-muted-foreground">ID:</span> <code className="break-all">{selectedFull.id}</code></div>
                  <div><span className="text-muted-foreground">Status:</span> {selectedFull.status}</div>
                  <div><span className="text-muted-foreground">Name:</span> {selectedFull.name || "—"}</div>
                  {selectedFull.trigger && <div className="col-span-2"><span className="text-muted-foreground">Trigger:</span> {selectedFull.trigger}</div>}
                  {selectedFull.body && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Body:</span>
                      <p className="mt-1 whitespace-pre-wrap">{selectedFull.body}</p>
                    </div>
                  )}
                </div>
                {Array.isArray(selectedFull.steps) && selectedFull.steps.length > 0 && (
                  <div>
                    <Label className="mb-1 block text-xs font-medium">Steps ({selectedFull.steps.length})</Label>
                    <ol className="list-decimal space-y-1 pl-4 text-xs">
                      {selectedFull.steps.map((step, i) => (
                        <li key={i} className="whitespace-pre-wrap">{typeof step === "string" ? step : JSON.stringify(step, null, 2)}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {(() => {
                  const known = ["id", "name", "title", "body", "trigger", "steps", "status"];
                  const others = Object.fromEntries(Object.entries(selectedFull).filter(([k]) => !known.includes(k)));
                  if (Object.keys(others).length === 0) return null;
                  return (
                    <div>
                      <Label className="mb-1 block text-xs font-medium">Other fields</Label>
                      <pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(others, null, 2)}</pre>
                    </div>
                  );
                })()}
              </div>

              <form onSubmit={handleInvoke} className="space-y-4">
                <div className="space-y-2">
                  <Label>Arguments</Label>
                  <div className="space-y-2">
                    {invokeArgs.map((row) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <Input
                          value={row.key}
                          onChange={(e) => updateArg(row.id, "key", e.target.value)}
                          placeholder="key"
                          className="flex-1"
                        />
                        <Input
                          value={row.value}
                          onChange={(e) => updateArg(row.id, "value", e.target.value)}
                          placeholder="value"
                          className="flex-1"
                        />
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeArg(row.id)} disabled={invokeArgs.length <= 1}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addArg}><Plus size={14} className="mr-1" />Add Argument</Button>
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
                <Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(selectedFull.id)}><Trash2 size={14} className="mr-1" />Delete Playbook</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
