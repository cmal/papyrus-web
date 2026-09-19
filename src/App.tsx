import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useConnectionStore } from "@/store/connection";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  // The sidebar is a static column at >= lg and an off-canvas drawer below it.
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // Navigating from inside the drawer must dismiss it.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {/* min-w-0: without it the wide kanban/graph scrollers below would stretch this
          flex item past the viewport instead of scrolling inside it. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onOpenNav={() => setNavOpen(true)} />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { health, init } = useConnectionStore();
  const location = useLocation();

  useEffect(() => {
    init();
  }, [init]);

  if (!health?.ok) {
    return <ConnectPage />;
  }

  return (
    <AppLayout>
      <ErrorBoundary resetKey={location.pathname}>
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
      </ErrorBoundary>
    </AppLayout>
  );
}
