import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ProjectRef {
  id: string;
  name: string;
  projectRoot: string;
}

interface ProjectState {
  currentProject: ProjectRef | null; // null = 全局
  setCurrentProject: (p: ProjectRef | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      setCurrentProject: (p) => set({ currentProject: p }),
    }),
    { name: "papyrus-web-project" },
  ),
);
