"use client";

import { useState } from "react";

import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";
import { InProgressLabel } from "@/components/TaskLabels";
import { SpacePicker } from "@/components/SpaceLock";
import { usePersonalSpaceCtx } from "@/components/DashboardShell";
import { useTasksAndProjects } from "@/hooks/useTasksAndProjects";
import { STATUS_META } from "@/lib/types";
import type { Project, ProjectStatus, Task } from "@/lib/types";

function formatDue(value: string | null) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isOverdue(value: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ProjectModal({ initial, onSave, onClose }: {
  initial?: Partial<Project>;
  onSave: (title: string, description: string, status: ProjectStatus, space?: "professional" | "personal") => void;
  onClose: () => void;
}) {
  const [title, setTitle]   = useState(initial?.title ?? "");
  const [desc, setDesc]     = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? "planning");
  const [space, setSpace]   = useState<"professional" | "personal">("professional");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(20,20,19,0.55)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl border border-hairline bg-white flex flex-col max-h-[90vh] animate-fade">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">{initial?.id ? "Edit project" : "New project"}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form className="overflow-y-auto flex flex-col gap-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onSave(title.trim(), desc.trim(), status, initial?.id ? undefined : space); onClose(); } }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Project name</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Website redesign" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Description</label>
            <MarkdownEditor value={desc} onChange={setDesc} placeholder="What is this project about? Markdown supported…" minHeight={90} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(["planning", "active", "on-hold", "completed"] as ProjectStatus[]).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-md border py-2 text-sm font-medium capitalize transition ${status === s ? "border-coral bg-coral/10 text-coral" : "border-hairline bg-canvas text-ink-muted hover:border-coral/50 hover:text-ink"}`}>
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-hairline pt-4">
            {!initial?.id ? <SpacePicker value={space} onChange={setSpace} /> : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">Cancel</button>
              <button type="submit" className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white transition hover:bg-coral-active">{initial?.id ? "Save changes" : "Create project"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTaskModal({ onSave, onClose }: { onSave: (title: string, notes: string, dueAt: string | null) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(20,20,19,0.55)" }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl border border-hairline bg-white flex flex-col max-h-[90vh] animate-fade">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">Add task</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form className="overflow-y-auto flex flex-col gap-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onSave(title.trim(), notes.trim(), dueAt ? new Date(dueAt).toISOString() : null); onClose(); } }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Task title</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Notes (optional)</label>
            <MarkdownEditor value={notes} onChange={setNotes} placeholder="Markdown supported…" minHeight={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Due date & time</label>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-coral" />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">Cancel</button>
            <button type="submit" className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white transition hover:bg-coral-active">Add task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Project card ───────────────────────────────────────────────────────────────

function ProjectCard({ project, taskCount, onSelect, onDelete }: { project: Project; taskCount: number; onSelect: () => void; onDelete: () => void }) {
  const meta = STATUS_META[project.status];
  return (
    <button type="button" onClick={onSelect} className="group relative w-full rounded-xl border border-hairline bg-canvas p-5 text-left transition hover:border-coral/40 hover:shadow-sm animate-rise">
      <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] ${meta.pill}`}>{meta.label}</span>
      <h3 className="mt-3 font-display text-lg font-normal tracking-[-0.2px] text-ink group-hover:text-coral transition">{project.title}</h3>
      {project.description && <p className="mt-1 text-sm text-ink-muted leading-relaxed line-clamp-2">{project.description}</p>}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-ink-soft">{taskCount} {taskCount === 1 ? "task" : "tasks"}</span>
        <span className="text-xs text-ink-soft">{new Date(project.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute right-3 top-3 hidden rounded-md border border-transparent p-1 text-xs text-ink-soft transition hover:border-hairline hover:text-coral group-hover:flex">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M4.5 3V1.5h3V3M5 5.5v4M7 5.5v4M2.5 3l.5 7.5h6L9.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </button>
  );
}

// ── Project list ───────────────────────────────────────────────────────────────

function ProjectList({ projects, tasks, onSelect, onCreate, onDelete }: {
  projects: Project[];
  tasks: Task[];
  onSelect: (id: string) => void;
  onCreate: (title: string, description: string, status: ProjectStatus, space?: "professional" | "personal") => void;
  onDelete: (id: string) => void;
}) {
  const { unlocked } = usePersonalSpaceCtx();
  const [showModal, setShowModal] = useState(false);
  const visibleProjects = projects.filter((p) => p.space !== "personal" || unlocked);

  return (
    <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Your workspace</p>
          <h1 className="mt-2 font-display text-4xl font-normal tracking-[-1px] text-ink md:text-5xl">Projects</h1>
          <p className="mt-3 max-w-xl text-sm text-ink-muted leading-relaxed">Organise related tasks into projects. Tasks added here also appear in your Tasks view.</p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New project
        </button>
      </header>

      {visibleProjects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-hairline">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="13" rx="2" stroke="#cc785c" strokeWidth="1.4"/><path d="M6 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1M7 9h6M7 12h4" stroke="#cc785c" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <p className="text-sm text-ink-muted">No projects yet. Create one to get started.</p>
          <button type="button" onClick={() => setShowModal(true)} className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active">Create your first project</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((p) => (
            <ProjectCard key={p.id} project={p} taskCount={tasks.filter((t) => t.projectId === p.id).length} onSelect={() => onSelect(p.id)} onDelete={() => onDelete(p.id)} />
          ))}
        </div>
      )}

      {showModal && <ProjectModal onSave={onCreate} onClose={() => setShowModal(false)} />}
    </section>
  );
}

// ── Project detail ────────────────────────────────────────────────────────────

function ProjectDetail({ project, tasks, onBack, onUpdateProject, onDeleteProject, onAddTask, onToggleComplete, onRemoveTask, onEditTask }: {
  project: Project;
  tasks: Task[];
  onBack: () => void;
  onUpdateProject: (patch: Partial<Project>) => void;
  onDeleteProject: () => void;
  onAddTask: (title: string, notes: string, dueAt: string | null) => void;
  onToggleComplete: (id: string) => void;
  onRemoveTask: (id: string) => void;
  onEditTask: (id: string, title: string, notes: string, dueAt: string | null) => void;
}) {
  const [showAddTask, setShowAddTask]         = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editingId, setEditingId]             = useState<string | null>(null);
  const [editTitle, setEditTitle]             = useState("");
  const [editNotes, setEditNotes]             = useState("");
  const [editDueAt, setEditDueAt]             = useState("");
  const [expandedId, setExpandedId]           = useState<string | null>(null);

  const meta = STATUS_META[project.status];
  const done = tasks.filter((t) => t.completed).length;

  function startEdit(t: Task) {
    setEditingId(t.id);
    setEditTitle(t.title);
    setEditNotes(t.notes);
    setEditDueAt(t.dueAt ? t.dueAt.slice(0, 16) : "");
  }

  function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    onEditTask(editingId, editTitle.trim(), editNotes.trim(), editDueAt ? new Date(editDueAt).toISOString() : null);
    setEditingId(null);
  }

  return (
    <section className="flex w-full flex-col gap-0 px-8 py-10 lg:px-10">
      <div className="mb-6">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs text-ink-muted transition hover:text-coral mb-4">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All projects
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-6">
          <div>
            <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] ${meta.pill}`}>{meta.label}</span>
            <h1 className="mt-2 font-display text-3xl font-normal tracking-[-0.5px] text-ink md:text-4xl">{project.title}</h1>
            {project.description && <RenderedMarkdown source={project.description} className="markdown-rendered mt-2 max-w-xl text-sm text-ink-muted leading-relaxed" />}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowEditProject(true)} className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">Edit</button>
            <button type="button" onClick={onDeleteProject} className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-coral">Delete</button>
          </div>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-ink-muted">{done} / {tasks.length} tasks complete</p>
            <p className="text-xs font-medium text-ink-muted">{Math.round((done / tasks.length) * 100)}%</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-card overflow-hidden">
            <div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${(done / tasks.length) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Tasks</p>
        <button type="button" onClick={() => setShowAddTask(true)} className="flex items-center gap-1.5 rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white transition hover:bg-coral-active">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-ink-soft">No tasks yet. Add one to get started.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task, index) => {
            const overdue   = isOverdue(task.dueAt) && !task.completed;
            const isEditing = editingId === task.id;
            const dueLabel  = formatDue(task.dueAt);

            return (
              <article key={task.id} className={`rounded-lg border bg-canvas p-4 transition animate-rise ${overdue ? "border-coral/30" : "border-hairline"} ${task.completed ? "opacity-60" : ""}`} style={{ animationDelay: `${index * 30}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button type="button" onClick={() => onToggleComplete(task.id)} className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border transition ${task.completed ? "border-coral bg-coral" : "border-hairline bg-canvas hover:border-coral"}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium text-ink leading-snug ${task.completed ? "line-through text-ink-soft" : ""}`}>{task.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {dueLabel && <span className="text-xs text-ink-soft">{dueLabel}</span>}
                        {overdue && <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-coral">Overdue</span>}
                        {task.inProgress && !task.completed && <InProgressLabel />}
                      </div>
                      {task.notes && !isEditing && (
                        <button type="button" onClick={() => setExpandedId(expandedId === task.id ? null : task.id)} className="mt-1 text-xs text-ink-soft hover:text-ink transition">
                          {expandedId === task.id ? "Hide notes" : "Show notes"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button type="button" onClick={() => isEditing ? setEditingId(null) : startEdit(task)} className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">{isEditing ? "Cancel" : "Edit"}</button>
                    <button type="button" onClick={() => onRemoveTask(task.id)} className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-coral">Delete</button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 rounded-md border border-hairline bg-surface-card p-4 flex flex-col gap-3 animate-fade">
                    <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-coral" />
                    <MarkdownEditor value={editNotes} onChange={setEditNotes} placeholder="Notes…" minHeight={80} />
                    <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-coral" />
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEdit} className="rounded-md bg-coral px-4 py-1.5 text-xs font-medium text-white transition hover:bg-coral-active">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-hairline px-4 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">Cancel</button>
                    </div>
                  </div>
                )}

                {expandedId === task.id && task.notes && !isEditing && (
                  <div className="mt-3 rounded-md border border-hairline bg-surface-card px-4 py-3 animate-fade">
                    <RenderedMarkdown source={task.notes} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showAddTask && <AddTaskModal onSave={onAddTask} onClose={() => setShowAddTask(false)} />}
      {showEditProject && (
        <ProjectModal
          initial={project}
          onSave={(title, description, status) => onUpdateProject({ title, description, status })}
          onClose={() => setShowEditProject(false)}
        />
      )}
    </section>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ProjectsApp() {
  const { tasks, projects, loading, createTask, updateTask, deleteTask, createProject, updateProject, deleteProject } = useTasksAndProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
        <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading projects…</div>
      </section>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;
  const projectTasks    = tasks.filter((t) => t.projectId === selectedId);

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        tasks={projectTasks}
        onBack={() => setSelectedId(null)}
        onUpdateProject={(patch) => updateProject(selectedProject.id, patch)}
        onDeleteProject={() => { deleteProject(selectedProject.id); setSelectedId(null); }}
        onAddTask={(title, notes, dueAt) => createTask({ title, notes, dueAt, projectId: selectedProject.id })}
        onToggleComplete={(id) => { const t = tasks.find((x) => x.id === id); if (t) updateTask(id, { completed: !t.completed }); }}
        onRemoveTask={deleteTask}
        onEditTask={(id, title, notes, dueAt) => updateTask(id, { title, notes, dueAt })}
      />
    );
  }

  return (
    <ProjectList
      projects={projects}
      tasks={tasks}
      onSelect={setSelectedId}
      onCreate={(title, description, status, space) => createProject({ title, description, status, space })}
      onDelete={deleteProject}
    />
  );
}
