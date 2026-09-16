import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, StickyNote, CheckCircle2 } from "lucide-react";

interface Note {
  id: string;
  name: string;
  title: string;
  content?: string;
  body?: string;
  status: string;
  createdAt?: string;
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

  const { data, isLoading } = useQuery({
    queryKey: ["notes.list"],
    queryFn: () => client!.call("notes.list", {}),
    enabled: !!client,
  });

  const notes = extractList(data);

  const captureMutation = useMutation({
    mutationFn: (content: string) => client!.call("notes.capture", { content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notes.list"] }); setNewNote(""); },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => client!.call("notes.update", { id, status: "resolved" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes.list"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => client!.call("artifact.remove", { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes.list"] }),
  });

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    captureMutation.mutate(newNote);
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const openNotes = notes.filter((n) => n.status === "open" || !n.status);
  const resolvedNotes = notes.filter((n) => n.status === "resolved" || n.status === "dismissed");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Badge variant="secondary">{notes.length}</Badge>
          <Badge variant="info">{openNotes.length} open</Badge>
        </div>
        <form onSubmit={handleCapture} className="mt-3 flex gap-2">
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Capture a thought, idea, or reminder..."
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newNote.trim() || captureMutation.isPending}>
            <Plus size={16} className="mr-1" /> Capture
          </Button>
        </form>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {openNotes.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Open</h3>
              <div className="space-y-2">
                {openNotes.map((note) => (
                  <Card key={note.id} className="hover:shadow-sm">
                    <CardContent className="flex items-start gap-3 p-3">
                      <StickyNote size={16} className="mt-0.5 shrink-0 text-yellow-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{note.title || note.name || note.content || note.body}</p>
                        {note.createdAt && <p className="mt-1 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
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
          {resolvedNotes.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Resolved</h3>
              <div className="space-y-2 opacity-60">
                {resolvedNotes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                      <p className="flex-1 text-sm line-through">{note.title || note.name || note.content || note.body}</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMutation.mutate(note.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {notes.length === 0 && <div className="text-center text-muted-foreground">No notes yet. Capture your first thought above.</div>}
        </div>
      </div>
    </div>
  );
}
