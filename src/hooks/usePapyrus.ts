import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnectionStore } from "@/store/connection";

export function usePapyrusOp<T>(operation: string, input?: Record<string, unknown>, enabled = true) {
  const client = useConnectionStore((s) => s.client);
  return useQuery({
    queryKey: [operation, input],
    queryFn: () => client!.call<Record<string, unknown>, T>(operation, input ?? {}),
    enabled: !!client && enabled,
  });
}

export function usePapyrusMutation<Input extends Record<string, unknown>, Output>(operation: string, invalidateKeys?: string[][]) {
  const client = useConnectionStore((s) => s.client);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Input) => client!.call<Input, Output>(operation, input),
    onSuccess: () => {
      invalidateKeys?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  });
}

// Task hooks
export const useTasks = (input?: Record<string, unknown>) => usePapyrusOp<any>("tasks.list", input);
export const useTask = (id: string) => usePapyrusOp<any>("tasks.show", { id });
export const useTaskPlan = () => usePapyrusOp<any>("tasks.plan", {});

// Doc hooks
export const useDocs = (input?: Record<string, unknown>) => usePapyrusOp<any>("docs.list", input);
export const useDoc = (id: string) => usePapyrusOp<any>("docs.show", { id });

// Rule hooks
export const useRules = (input?: Record<string, unknown>) => usePapyrusOp<any>("rules.list", input);

// Playbook hooks
export const usePlaybooks = (input?: Record<string, unknown>) => usePapyrusOp<any>("playbooks.list", input);

// Note hooks
export const useNotes = (input?: Record<string, unknown>) => usePapyrusOp<any>("notes.list", input);

// Project hooks
export const useProjects = (input?: Record<string, unknown>) => usePapyrusOp<any>("projects.list", input);

// Graph hooks
export const useGraph = (input?: Record<string, unknown>) => usePapyrusOp<any>("graph.traverse", input);
export const useOperations = () => usePapyrusOp<any[]>("__ops__", {}, false);
