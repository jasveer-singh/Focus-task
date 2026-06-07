"use client";

import { useMemo } from "react";
import { useTasksAndProjects } from "@/hooks/useTasksAndProjects";
import type { Task } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDue(value: string | null) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isOverdue(value: string | null) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

function isDueToday(value: string | null) {
  if (!value) return false;
  const dt = new Date(value);
  const now = new Date();
  return (
    dt.getFullYear() === now.getFullYear() &&
    dt.getMonth() === now.getMonth() &&
    dt.getDate() === now.getDate()
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const overdue = isOverdue(task.dueAt) && !task.completed;
  const dueLabel = formatDue(task.dueAt);

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-canvas px-4 py-3 transition ${overdue ? "border-coral/30" : "border-hairline"} ${task.completed ? "opacity-50" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`h-4 w-4 shrink-0 rounded-full border transition ${task.completed ? "border-coral bg-coral" : "border-hairline bg-canvas hover:border-coral"}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-snug text-ink ${task.completed ? "line-through text-ink-soft" : ""}`}>
          {task.title}
        </p>
        {dueLabel && (
          <p className={`mt-0.5 text-xs ${overdue ? "text-coral" : "text-ink-soft"}`}>
            {overdue ? "Overdue · " : ""}{dueLabel}
          </p>
        )}
      </div>
      {overdue && !task.completed && (
        <span className="shrink-0 rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-coral">
          Overdue
        </span>
      )}
    </div>
  );
}

export default function TodayApp() {
  const { tasks, loading, updateTask } = useTasksAndProjects();

  const today = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }, []);

  const overdueTasks = useMemo(() =>
    tasks.filter((t) => !t.completed && isOverdue(t.dueAt) && !isDueToday(t.dueAt))
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()),
    [tasks]
  );

  const todayTasks = useMemo(() =>
    tasks.filter((t) => !t.completed && isDueToday(t.dueAt))
      .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()),
    [tasks]
  );

  const completedToday = useMemo(() =>
    tasks.filter((t) => t.completed && isDueToday(t.dueAt)),
    [tasks]
  );

  const totalDue = overdueTasks.length + todayTasks.length;
  const done = completedToday.length;

  if (loading) {
    return (
      <section className="flex w-full flex-col px-8 py-10 lg:px-10">
        <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading…</div>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
      {/* Header */}
      <header className="border-b border-hairline pb-8">
        <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">{today}</p>
        <h1 className="mt-2 font-display text-4xl font-normal tracking-[-1px] text-ink md:text-5xl">
          {greeting()}.
        </h1>
        {totalDue > 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            You have <span className="font-medium text-ink">{totalDue} task{totalDue !== 1 ? "s" : ""}</span> to tackle today.
            {done > 0 && <span className="text-green-600"> {done} done so far.</span>}
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            {done > 0 ? `All caught up — ${done} task${done !== 1 ? "s" : ""} completed today. ✓` : "Nothing due today. Enjoy the clarity."}
          </p>
        )}
      </header>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-coral">Overdue</p>
          {overdueTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => updateTask(task.id, { completed: true })}
            />
          ))}
        </div>
      )}

      {/* Due today */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Due today</p>
        {todayTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hairline p-8 text-center text-sm text-ink-soft">
            Nothing due today.
          </div>
        ) : (
          todayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => updateTask(task.id, { completed: true })}
            />
          ))
        )}
      </div>

      {/* Completed today */}
      {completedToday.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Completed today</p>
          {completedToday.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={() => updateTask(task.id, { completed: false })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
