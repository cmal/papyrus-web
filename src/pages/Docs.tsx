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
import { Plus, Trash2, FileText } from "lucide-react";

interface Doc {
  id: string;
  name: string;
  title: string;
  body?: string;
  status: string;
  labels: string[];
  projectRoot?: string | null;
  [key: string]: unknown;
}

function extractList(data: any, key: string): Doc[] {
  if (Array.isArray(data)) return data;
  if (data?.[key]) return data[key];
  if (data?.items) return data.items;
  if (data?.result) return extractList(data.result, key);
  return [];
}

export default function DocsPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [projectScope, setProjectScope] = useState("current");
  const [selected, setSelected] = useState<Doc | null>(null);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, isLoading } = useQuery({
    queryKey: ["docs.list"],
    queryFn: () => client!.call("docs.list", {}),
    enabled: !!client,
  });

  const docs = extractList(data, "docs");

  const createMutation = useMutation({
    mutationFn: (input: any) => client!.call("docs.create", input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["docs.list"] }); setCreateOpen(false); setNewTitle(""); setNewBody(""); setProjectScope("current"); },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["docs.list"] }); setSelected(null); },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const scope = projectScope;
    createMutation.mutate({ title: newTitle, body: newBody || undefined }, {
      onSuccess: (result: any) => {
        const id = result?.id || result;
        if (id && scope === "current" && currentProject) {
          client!.call("docs.add_project", { id, project: currentProject.name }).catch(() => {});
        }
      },
    });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Docs</h2>
          <Badge variant="secondary">{docs.length}</Badge>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={16} className="mr-1" /> New</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Doc</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus /></div>
              <div className="space-y-2"><Label>Body</Label><Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={6} /></div>
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
          {docs.map((doc) => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelected(doc)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <FileText size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.title || doc.name}</p>
                    {doc.body && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{doc.body}</p>}
                  </div>
                </div>
                <div className="mt-2 flex gap-1">
                  <Badge variant="outline" className="text-[10px]">{doc.status}</Badge>
                  {doc.labels?.slice(0, 2).map((l) => <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
          {docs.length === 0 && <div className="col-span-full text-center text-muted-foreground">No docs yet.</div>}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.title || selected.name}</DialogTitle></DialogHeader>
              {selected.body && <div className="max-h-[50vh] overflow-auto rounded-md bg-muted p-4"><p className="whitespace-pre-wrap text-sm">{selected.body}</p></div>}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">ID:</span> <code className="text-xs">{selected.id}</code></div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
              </div>
              <DialogFooter><Button variant="destructive" size="sm" onClick={() => removeMutation.mutate(selected.id)}><Trash2 size={14} className="mr-1" />Remove</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
