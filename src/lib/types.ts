export type ProjectStatus = "planning" | "active" | "on-hold" | "completed";

export type Project = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  createdAt: number;
};

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Task = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  pinned: boolean;
  dueAt: string | null;
  createdAt: number;
  projectId?: string | null;
  checklist?: ChecklistItem[] | null;
};

export const TASKS_KEY    = "focus-tasks-v1";
export const PROJECTS_KEY = "suru-projects-v1";

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = ["planning", "active", "on-hold", "completed"];

export const STATUS_META: Record<ProjectStatus, { label: string; pill: string }> = {
  planning:  { label: "Planning",  pill: "bg-surface-card text-ink-muted"  },
  active:    { label: "Active",    pill: "bg-coral/10 text-coral"           },
  "on-hold": { label: "On hold",   pill: "bg-surface-card text-ink-muted"  },
  completed: { label: "Completed", pill: "bg-surface-soft text-ink-soft"   },
};

export function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
