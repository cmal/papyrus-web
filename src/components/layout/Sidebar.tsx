import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  ListTodo,
  FileText,
  Shield,
  BookOpen,
  StickyNote,
  FolderGit2,
  Network,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/docs", label: "Docs", icon: FileText },
  { to: "/rules", label: "Rules", icon: Shield },
  { to: "/playbooks", label: "Playbooks", icon: BookOpen },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/projects", label: "Projects", icon: FolderGit2 },
  { to: "/graph", label: "Graph", icon: Network },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass} onClick={onNavigate}>
            <item.icon size={16} className="shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-2">
        <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
          <Settings size={16} className="shrink-0" />
          Settings
        </NavLink>
      </div>
    </>
  );
}

function SidebarBrand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpen size={16} />
      </div>
      <span className="font-semibold">Papyrus</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="ml-auto rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Desktops and up: docked column. */}
      <aside className="hidden h-dvh w-56 shrink-0 flex-col border-r bg-muted/30 lg:flex">
        <SidebarBrand />
        <SidebarNav />
      </aside>

      {/* Phones and tablets: off-canvas drawer. Rendered only while open so its links
          never sit in the tab order behind the page. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] animate-in flex-col border-r bg-background shadow-xl duration-200 slide-in-from-left"
          >
            <SidebarBrand onClose={onClose} />
            <SidebarNav onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
