// Papyrus domain types

export type ArtifactKind = "task" | "doc" | "rule" | "playbook" | "note";

export type TaskStatus =
  | "backlog"
  | "ready"
  | "active"
  | "paused"
  | "submitted"
  | "completed"
  | "rejected"
  | "cancelled";

export type DocStatus = "draft" | "active" | "archived";
export type RuleStatus = "draft" | "active" | "disabled";
export type PlaybookStatus = "draft" | "active" | "archived";
export type NoteStatus = "open" | "resolved" | "dismissed";

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  name: string;
  title: string;
  body?: string;
  status: string;
  labels: string[];
  projectRoot?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface Task extends Artifact {
  kind: "task";
  status: TaskStatus;
  focus?: boolean;
  gates?: unknown[];
  checklist?: unknown[];
}

export interface Doc extends Artifact {
  kind: "doc";
  status: DocStatus;
}

export interface Rule extends Artifact {
  kind: "rule";
  status: RuleStatus;
  condition?: string;
  action?: string;
}

export interface Playbook extends Artifact {
  kind: "playbook";
  status: PlaybookStatus;
  trigger?: string;
  steps?: unknown[];
}

export interface Note extends Artifact {
  kind: "note";
  status: NoteStatus;
  content?: string;
}

export interface Project {
  id: string;
  name: string;
  projectRoot: string;
  aliases: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface GraphNode {
  id: string;
  name: string;
  kind: ArtifactKind;
  status: string;
}

export interface OperationName {
  name: string;
  domain: string;
  description?: string;
}

export interface HealthState {
  ok: boolean;
  version: string;
  schema: {
    state: "ok" | "migrationRequired" | "error";
    current?: number;
    latest?: number;
  };
}

export interface ConnectionConfig {
  baseUrl: string;
  token: string;
}
