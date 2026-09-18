import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { useProjectStore } from "@/store/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, StickyNote, CheckCircle2, FolderGit2, Globe, Undo2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Note {
  id: string;
  name: string;
  title: string;
  content?: string;
  body?: string;
  status: string;
  createdAt?: string;
  created_at?: string;
  labels?: string[];
  [key: string]: unknown;
}

function extractList(data: any): Note[] {
  if (Array.isArray(data)) return data;
  if (data?.notes) return data.notes;
  if (data?.items) return data.items;
  if (data?.result) return extractList(data.result);
  return [];
}

export default function NotesPage() {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const currentProject = useProjectStore((s) => s.currentProject);

  const { data, isLoading } = useQuery({
    queryKey: ["notes.list", currentProject?.projectRoot],
    queryFn: () => client!.call("notes.list", { project_root: currentProject!.projectRoot }),
    enabled: !!client && !!currentProject,
  });

  const notes = extractList(data);

  const captureMutation = useMutation({
    mutationFn: (input: any) => client!.call("notes.capture", input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notes.list"] }); setNewNote(""); },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => client!.call("notes.consume", { id, project_root: currentProject!.projectRoot }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes.list"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes.list"] }),
  });

  const redraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/papyrus-web/redraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "redraft failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes.list"] }),
  });

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !currentProject) return;
    captureMutation.mutate({ body: newNote, project_root: currentProject.projectRoot });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  if (!currentProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <StickyNote size={28} className="text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Select a project to view notes</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Notes are scoped to a project. Use the project selector in the header to choose a project.
        </p>
      </div>
    );
  }

  const draftNotes = notes.filter((n) => n.status === "draft" || !n.status);
  const activeNotes = notes.filter((n) => n.status === "active");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Badge variant="secondary">{notes.length}</Badge>
          <Badge variant="info">{draftNotes.length} inbox</Badge>
        </div>
        <form onSubmit={handleCapture} className="mt-3 flex items-center gap-2">
          {currentProject ? (
            <Badge variant="info" className="shrink-0 gap-1 border-2 border-primary/30 bg-primary/10 px-2.5 py-1.5 text-primary">
              <FolderGit2 size={12} />
              <span className="max-w-[100px] truncate">{currentProject.name}</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="shrink-0 gap-1 px-2.5 py-1.5 text-muted-foreground">
              <Globe size={12} />
              Global
            </Badge>
          )}
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={currentProject ? `Capture to "${currentProject.name}"...` : "Capture a thought, idea, or reminder..."}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newNote.trim() || captureMutation.isPending || !currentProject}>
            <Plus size={16} className="mr-1" /> Capture
          </Button>
        </form>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {draftNotes.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Inbox</h3>
              <div className="space-y-2">
                {draftNotes.map((note) => (
                  <Card key={note.id} className="hover:shadow-sm">
                    <CardContent className="flex items-start gap-3 p-3">
                      <StickyNote size={16} className="mt-0.5 shrink-0 text-yellow-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{note.title || note.name || note.content || note.body}</p>
                        {note.created_at ? <p className="mt-1 text-xs text-muted-foreground">{new Date(note.created_at as string).toLocaleString()}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedNote(note)} title="View details">
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => resolveMutation.mutate(note.id)} title="Resolve">
                          <CheckCircle2 size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMutation.mutate(note.id)} title="Delete">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {activeNotes.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Active</h3>
              <div className="space-y-2 opacity-60">
                {activeNotes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                      <p className="flex-1 text-sm line-through">{note.title || note.name || note.content || note.body}</p>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedNote(note)} title="View details">
                          <Eye size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => redraftMutation.mutate(note.id)} title="Back to draft">
                          <Undo2 size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMutation.mutate(note.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {notes.length === 0 && <div className="text-center text-muted-foreground">No notes yet. Capture your first thought above.</div>}
        </div>
      </div>

      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={(o) => { if (!o) setSelectedNote(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote size={18} className="text-yellow-500" />
              <span className="flex-1 truncate">{selectedNote?.title || selectedNote?.name || "(untitled)"}</span>
              <Badge variant="secondary">{selectedNote?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedNote?.created_at && (
              <p className="text-xs text-muted-foreground">Created: {new Date(selectedNote.created_at as string).toLocaleString()}</p>
            )}
            <div className="rounded-md border bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm">{selectedNote?.body || selectedNote?.content || "(no body content)"}</p>
            </div>
            {selectedNote?.labels && Array.isArray(selectedNote.labels) && selectedNote.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedNote.labels.map((label: string, i: number) => (
                  <Badge key={i} variant="outline">{label}</Badge>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
