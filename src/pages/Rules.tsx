import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Shield } from "lucide-react";

interface Rule {
  id: string;
  name: string;
  title: string;
  body?: string;
  condition?: string;
  action?: string;
  status: string;
  labels: string[];
  [key: string]: unknown;
}

function extractList(data: any): Rule[] {
  if (Array.isArray(data)) return data;
  if (data?.rules) return data.rules;
  if (data?.items) return data.items;
  if (data?.result) return extractList(data.result);
  return [];
}

export default function RulesPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [newAction, setNewAction] = useState("");
  const [selected, setSelected] = useState<Rule | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["rules.list"],
    queryFn: () => client!.call("rules.list", {}),
    enabled: !!client,
  });

  const rules = extractList(data);

  const createMutation = useMutation({
    mutationFn: (input: any) => client!.call("rules.create", input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules.list"] }); setCreateOpen(false); setNewTitle(""); setNewCondition(""); setNewAction(""); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules.list"] }); setSelected(null); },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle, condition: newCondition || undefined, action: newAction || undefined });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Rules</h2>
          <Badge variant="secondary">{rules.length}</Badge>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} className="mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Rule</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus /></div>
              <div className="space-y-2"><Label>Condition</Label><Textarea value={newCondition} onChange={(e) => setNewCondition(e.target.value)} rows={2} placeholder="When this rule applies..." /></div>
              <div className="space-y-2"><Label>Action</Label><Textarea value={newAction} onChange={(e) => setNewAction(e.target.value)} rows={3} placeholder="What the rule enforces..." /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!newTitle.trim()}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected(rule)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{rule.title || rule.name}</p>
                      <Badge variant={rule.status === "active" ? "success" : "secondary"} className="text-[10px]">{rule.status}</Badge>
                    </div>
                    {rule.condition && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium">If:</span> {rule.condition}</p>}
                    {rule.action && <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-medium">Then:</span> {rule.action}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {rules.length === 0 && <div className="text-center text-muted-foreground">No rules yet.</div>}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.title || selected.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                {selected.condition && <div><Label>Condition</Label><div className="mt-1 rounded-md bg-muted p-3 text-sm">{selected.condition}</div></div>}
                {selected.action && <div><Label>Action</Label><div className="mt-1 rounded-md bg-muted p-3 text-sm">{selected.action}</div></div>}
                {selected.body && <div><Label>Body</Label><div className="mt-1 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{selected.body}</div></div>}
              </div>
              <DialogFooter><Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(selected.id)}><Trash2 size={14} className="mr-1" />Remove</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
