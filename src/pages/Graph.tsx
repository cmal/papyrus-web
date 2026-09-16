import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Network, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphNode {
  id: string;
  name: string;
  kind: string;
  status: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

const KIND_COLORS: Record<string, string> = {
  task: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  doc: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  rule: "bg-red-500/20 text-red-700 border-red-500/30",
  playbook: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  note: "bg-green-500/20 text-green-700 border-green-500/30",
};

export default function GraphPage() {
  const client = useConnectionStore((s) => s.client);
  const [rootId, setRootId] = useState("");
  const [depth, setDepth] = useState("4");

  const { data, isLoading, refetch } = useQuery<{ nodes?: GraphNode[]; vertices?: GraphNode[]; edges?: GraphEdge[] }>({
    queryKey: ["graph.traverse", rootId, depth],
    queryFn: () => client!.call("graph.traverse", { root: rootId || undefined, depth: parseInt(depth) || 4 }),
    enabled: !!client,
  });

  const nodes: GraphNode[] = data?.nodes || data?.vertices || [];
  const edges: GraphEdge[] = data?.edges || [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Graph</h2>
          <Badge variant="secondary">{nodes.length} nodes · {edges.length} edges</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={rootId} onChange={(e) => setRootId(e.target.value)} placeholder="Root artifact ID (optional)" className="h-8 w-56 pl-8 text-xs" />
          </div>
          <Input value={depth} onChange={(e) => setDepth(e.target.value)} className="h-8 w-16 text-center text-xs" placeholder="depth" />
          <Button size="sm" variant="outline" onClick={() => refetch()}>Traverse</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-muted-foreground">Loading graph...</div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Network size={48} className="mb-4 opacity-30" />
            <p>No graph data. Enter a root artifact ID or traverse from all roots.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Nodes */}
            <div>
              <h3 className="mb-2 text-sm font-medium">Nodes ({nodes.length})</h3>
              <div className="flex flex-wrap gap-2">
                {nodes.map((node) => (
                  <div key={node.id} className={cn("rounded-md border px-3 py-1.5 text-xs", KIND_COLORS[node.kind] || "bg-gray-500/10 border-gray-500/20")}>
                    <span className="font-medium">{node.name || node.id}</span>
                    <span className="ml-1 opacity-60">({node.kind})</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Edges */}
            <div>
              <h3 className="mb-2 text-sm font-medium">Edges ({edges.length})</h3>
              <div className="space-y-1">
                {edges.map((edge, i) => {
                  const source = nodes.find((n) => n.id === edge.source);
                  const target = nodes.find((n) => n.id === edge.target);
                  return (
                    <Card key={i} className="hover:shadow-sm">
                      <CardContent className="flex items-center gap-2 p-2 text-xs">
                        <span className="font-medium">{source?.name || edge.source}</span>
                        <Badge variant="outline" className="text-[10px]">{edge.relation}</Badge>
                        <span>→</span>
                        <span className="font-medium">{target?.name || edge.target}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
            {/* Raw JSON */}
            {data && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Raw Response</h3>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
