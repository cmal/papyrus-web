import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useConnectionStore } from "@/store/connection";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import ConnectPage from "@/pages/Connect";
import TasksPage from "@/pages/Tasks";
import DocsPage from "@/pages/Docs";
import RulesPage from "@/pages/Rules";
import PlaybooksPage from "@/pages/Playbooks";
import NotesPage from "@/pages/Notes";
import ProjectsPage from "@/pages/Projects";
import GraphPage from "@/pages/Graph";
import SettingsPage from "@/pages/Settings";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { client, init } = useConnectionStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!client) {
    return <ConnectPage />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/playbooks" element={<PlaybooksPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Routes>
    </AppLayout>
  );
}
