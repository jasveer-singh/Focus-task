"use client";

import { useCallback, useEffect, useState } from "react";
import type { Project, ProjectStatus, Task } from "@/lib/types";

type DbTask = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  inProgress: boolean;
  pinned: boolean;
  dueAt: string | null;
  createdAt: string;
  projectId: string | null;
  checklist?: Array<{ id: string; text: string; done: boolean }> | null;
};

type DbProject = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
};

function toTask(t: DbTask): Task {
  return {
    ...t,
    createdAt: new Date(t.createdAt).getTime(),
    dueAt: t.dueAt ?? null,
  };
}

function toProject(p: DbProject): Project {
  return {
    ...p,
    status: p.status as ProjectStatus,
    createdAt: new Date(p.createdAt).getTime(),
  };
}

export function useTasksAndProjects() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/projects").then((r) => r.json()),
    ]).then(([t, p]) => {
      setTasks(Array.isArray(t) ? t.map(toTask) : []);
      setProjects(Array.isArray(p) ? p.map(toProject) : []);
      setLoading(false);
    });
  }, []);

  // ── Tasks ──────────────────────────────────────────────────────────────────

  const createTask = useCallback(async (data: { title: string; notes: string; dueAt: string | null; projectId?: string | null }) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const t: DbTask = await res.json();
    setTasks((prev) => [toTask(t), ...prev]);
    return toTask(t);
  }, []);

  const updateTask = useCallback(async (id: string, patch: Partial<Pick<Task, "title" | "notes" | "completed" | "pinned" | "dueAt" | "projectId">>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const t: DbTask = await res.json();
    setTasks((prev) => prev.map((x) => (x.id === id ? toTask(t) : x)));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // ── Projects ───────────────────────────────────────────────────────────────

  const createProject = useCallback(async (data: { title: string; description: string; status: ProjectStatus }) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const p: DbProject = await res.json();
    setProjects((prev) => [toProject(p), ...prev]);
    return toProject(p);
  }, []);

  const updateProject = useCallback(async (id: string, patch: Partial<Pick<Project, "title" | "description" | "status">>) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const p: DbProject = await res.json();
    setProjects((prev) => prev.map((x) => (x.id === id ? toProject(p) : x)));
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((x) => x.id !== id));
    setTasks((prev) => prev.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)));
  }, []);

  return {
    tasks,
    projects,
    loading,
    createTask,
    updateTask,
    deleteTask,
    createProject,
    updateProject,
    deleteProject,
  };
}
