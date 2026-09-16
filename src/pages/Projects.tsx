import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderGit2, Search } from "lucide-react";

interface Project {
  id: string;
  name: string;
  root: string;
  aliases: string[];
  createdAt?: string;
  [key: string]: unknown;
}

function extractList(data: any): Project[] {
  if (Array.isArray(data)) return data;
  if (data?.projects) return data.projects;
  if (data?.items) return data.items;
  if (data?.result) return extractList(data.result);
  return [];
}

export default function ProjectsPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["projects.list"],
    queryFn: () => client!.call("projects.list", {}),
    enabled: !!client,
  });

  const projects = extractList(data);

  const registerMutation = useMutation({
    mutationFn: (input: any) => client!.call("projects.register", input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects.list"] }); setCreateOpen(false); setNewName(""); setNewPath(""); },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPath.trim()) return;
    registerMutation.mutate({ path: newPath, name: newName });
  };

  const filtered = projects.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.root?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Projects</h2>
          <Badge variant="secondary">{projects.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="h-8 w-48 pl-8 text-xs" />
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus size={16} className="mr-1" /> Register</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register Project</DialogTitle></DialogHeader>
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="MyProject" autoFocus /></div>
                <div className="space-y-2"><Label>Path</Label><Input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="/path/to/project" /></div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!newName.trim() || !newPath.trim()}>Register</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((proj) => (
            <Card key={proj.id} className="hover:shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <FolderGit2 size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{proj.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground" title={proj.root}>{proj.root}</p>
                  </div>
                </div>
                {proj.aliases?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {proj.aliases.map((a) => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground">No projects found.</div>}
        </div>
      </div>
    </div>
  );
}
