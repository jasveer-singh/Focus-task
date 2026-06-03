"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";
import { cancelNotifications, getReminderWindows, scheduleNotifications } from "@/lib/notifications";

type FollowUpState = "open" | "later" | "snoozed" | "missed" | "done";
type ReminderMeta  = { preDueSentAt?: number; lastEscalationAt?: number };

type DbTask = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  pinned: boolean;
  dueAt: string | null;
  createdAt: string;
  projectId: string | null;
};

type FeedbackItem = {
  id: string;
  from: string;
  message: string;
  receivedAt: string;
  dueAt: string | null;
  status: "new" | "planned" | "in-progress" | "done";
};

type IdeaItem = {
  id: string;
  title: string;
  notes: string;
  sourceUrl: string | null;
  createdAt: string;
};

type ProductivityModule = "reminders" | "feedback" | "ideas";

function isTaskOverdue(dueAt: string | null, completed: boolean) {
  if (!dueAt || completed) return false;
  const due = new Date(dueAt).getTime();
  return Number.isFinite(due) && due < Date.now();
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function ProductivityLayer({
  activeModule,
}: {
  activeModule: ProductivityModule;
  visibleAccountIds?: string[];
  activeAccountId?: string;
}) {
  const [tasks, setTasks]       = useState<DbTask[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [ideas, setIdeas]       = useState<IdeaItem[]>([]);
  const [loading, setLoading]   = useState(true);

  // followup/reminderMeta are per-device (snooze state) — localStorage is fine here
  const [followups, setFollowups]         = useState<Record<string, FollowUpState>>({});
  const [reminderMeta, setReminderMeta]   = useState<Record<string, ReminderMeta>>({});
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  // Feedback form state
  const [feedbackFrom, setFeedbackFrom]         = useState("");
  const [feedbackMessage, setFeedbackMessage]   = useState("");
  const [feedbackDueAt, setFeedbackDueAt]       = useState("");
  const [editingFeedbackId, setEditingFeedbackId]       = useState<string | null>(null);
  const [editingFeedbackFrom, setEditingFeedbackFrom]   = useState("");
  const [editingFeedbackMsg, setEditingFeedbackMsg]     = useState("");
  const [editingFeedbackDueAt, setEditingFeedbackDueAt] = useState("");

  // Idea form state
  const [ideaTitle, setIdeaTitle]               = useState("");
  const [ideaNotes, setIdeaNotes]               = useState("");
  const [ideaCaptureOpen, setIdeaCaptureOpen]   = useState(false);
  const [editingIdeaId, setEditingIdeaId]       = useState<string | null>(null);
  const [editingIdeaTitle, setEditingIdeaTitle] = useState("");
  const [editingIdeaNotes, setEditingIdeaNotes] = useState("");
  const [openIdeaMenuId, setOpenIdeaMenuId]     = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/feedback").then((r) => r.json()),
      fetch("/api/ideas").then((r) => r.json()),
    ]).then(([t, f, i]) => {
      setTasks(Array.isArray(t) ? t : []);
      setFeedback(Array.isArray(f) ? f : []);
      setIdeas(Array.isArray(i) ? i : []);
      setLoading(false);
    });

    try {
      setFollowups(JSON.parse(localStorage.getItem("focus-task-followups-v1") || "{}"));
      setReminderMeta(JSON.parse(localStorage.getItem("focus-task-reminder-meta-v1") || "{}"));
    } catch { /* ignore */ }
  }, []);

  // ── Cmd+Shift+I shortcut ──────────────────────────────────────────────────

  useEffect(() => {
    function onShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIdeaCaptureOpen(true);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  // ── Browser extension capture ─────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") !== "1") return;

    const title     = (params.get("title") || "Captured from browser").trim();
    const sourceUrl = (params.get("url") || "").trim() || null;
    const notes     = (params.get("notes") || "").trim();

    fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes, sourceUrl }),
    })
      .then((r) => r.json())
      .then((idea: IdeaItem) => setIdeas((prev) => [idea, ...prev]));

    params.delete("capture");
    params.delete("title");
    params.delete("url");
    params.delete("notes");
    const query = params.toString();
    window.history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, []);

  // ── Reminder polling ──────────────────────────────────────────────────────

  useEffect(() => {
    const timer = window.setInterval(() => {
      const followupMap  = JSON.parse(localStorage.getItem("focus-task-followups-v1") || "{}") as Record<string, FollowUpState>;
      const reminderMap  = JSON.parse(localStorage.getItem("focus-task-reminder-meta-v1") || "{}") as Record<string, ReminderMeta>;
      const now = Date.now();
      let updated = false;
      let latestMessage: string | null = null;

      for (const task of tasks) {
        if (!task.dueAt || task.completed) continue;
        const due = new Date(task.dueAt).getTime();
        if (!Number.isFinite(due)) continue;

        const meta  = reminderMap[task.id] || {};
        const state = followupMap[task.id] || "open";
        if (state === "snoozed" || state === "later") continue;

        const preDueThreshold = due - 30 * 60 * 1000;
        if (now >= preDueThreshold && now < due && !meta.preDueSentAt) {
          latestMessage = `Reminder: ${task.title} is due in under 30 minutes.`;
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Task reminder", { body: latestMessage });
          }
          reminderMap[task.id] = { ...meta, preDueSentAt: now };
          updated = true;
        }

        if (now >= due) {
          const interval = 60 * 60 * 1000;
          if (!meta.lastEscalationAt || now - meta.lastEscalationAt > interval) {
            latestMessage = `Escalation: ${task.title} is overdue.`;
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("Overdue task", { body: latestMessage });
            }
            reminderMap[task.id] = { ...reminderMap[task.id], lastEscalationAt: now };
            if (!followupMap[task.id] || followupMap[task.id] === "open") {
              followupMap[task.id] = "missed";
              scheduleNotifications({ sourceId: task.id, sourceType: "reminder", title: `Still overdue: ${task.title}`, dueAt: new Date(now + interval).toISOString(), reminderWindows: [0] });
            }
            updated = true;
          }
        }
      }

      if (updated) {
        localStorage.setItem("focus-task-followups-v1", JSON.stringify(followupMap));
        localStorage.setItem("focus-task-reminder-meta-v1", JSON.stringify(reminderMap));
        setFollowups(followupMap);
        setReminderMeta(reminderMap);
        if (latestMessage) setReminderMessage(latestMessage);
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [tasks]);

  // ── Reminders helpers ─────────────────────────────────────────────────────

  function setFollowup(taskId: string, state: FollowUpState) {
    const next = { ...followups, [taskId]: state };
    setFollowups(next);
    localStorage.setItem("focus-task-followups-v1", JSON.stringify(next));
  }

  async function patchTask(taskId: string, patch: Partial<DbTask>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated: DbTask = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    return updated;
  }

  async function snooze(taskId: string, minutes: number) {
    const newDueAt = new Date(Date.now() + minutes * 60_000).toISOString();
    const task = tasks.find((t) => t.id === taskId);
    await patchTask(taskId, { dueAt: newDueAt });
    setFollowup(taskId, "snoozed");
    setReminderMessage(`Snoozed for ${minutes} minutes.`);
    if (task) cancelNotifications(taskId).then(() => scheduleNotifications({ sourceId: taskId, sourceType: "task", title: task.title, dueAt: newDueAt, reminderWindows: getReminderWindows() }));
  }

  async function moveLaterToday(taskId: string) {
    const now = new Date();
    const target = new Date();
    target.setHours(Math.max(now.getHours() + 2, 17), 0, 0, 0);
    const newDueAt = target.toISOString();
    const task = tasks.find((t) => t.id === taskId);
    await patchTask(taskId, { dueAt: newDueAt });
    setFollowup(taskId, "later");
    setReminderMessage("Moved to later today.");
    if (task) cancelNotifications(taskId).then(() => scheduleNotifications({ sourceId: taskId, sourceType: "task", title: task.title, dueAt: newDueAt, reminderWindows: getReminderWindows() }));
  }

  async function moveTomorrow(taskId: string) {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(10, 0, 0, 0);
    const newDueAt = target.toISOString();
    const task = tasks.find((t) => t.id === taskId);
    await patchTask(taskId, { dueAt: newDueAt });
    setFollowup(taskId, "later");
    setReminderMessage("Moved to tomorrow 10:00 AM.");
    if (task) cancelNotifications(taskId).then(() => scheduleNotifications({ sourceId: taskId, sourceType: "task", title: task.title, dueAt: newDueAt, reminderWindows: getReminderWindows() }));
  }

  async function markDone(taskId: string) {
    await patchTask(taskId, { completed: true });
    setFollowup(taskId, "done");
    cancelNotifications(taskId);
  }

  // ── Feedback helpers ──────────────────────────────────────────────────────

  async function addFeedback() {
    if (!feedbackFrom.trim() || !feedbackMessage.trim()) return;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: feedbackFrom.trim(), message: feedbackMessage.trim(), dueAt: feedbackDueAt ? new Date(feedbackDueAt).toISOString() : null }),
    });
    const item: FeedbackItem = await res.json();
    setFeedback((prev) => [item, ...prev]);
    setFeedbackFrom(""); setFeedbackMessage(""); setFeedbackDueAt("");
  }

  async function updateFeedbackStatus(id: string, status: FeedbackItem["status"]) {
    const res = await fetch(`/api/feedback/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const updated: FeedbackItem = await res.json();
    setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }

  function startFeedbackEdit(item: FeedbackItem) {
    setEditingFeedbackId(item.id);
    setEditingFeedbackFrom(item.from);
    setEditingFeedbackMsg(item.message);
    setEditingFeedbackDueAt(item.dueAt ? item.dueAt.slice(0, 16) : "");
  }

  function cancelFeedbackEdit() {
    setEditingFeedbackId(null);
    setEditingFeedbackFrom(""); setEditingFeedbackMsg(""); setEditingFeedbackDueAt("");
  }

  async function saveFeedbackEdit(id: string) {
    if (!editingFeedbackFrom.trim() || !editingFeedbackMsg.trim()) return;
    const res = await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: editingFeedbackFrom.trim(), message: editingFeedbackMsg.trim(), dueAt: editingFeedbackDueAt ? new Date(editingFeedbackDueAt).toISOString() : null }),
    });
    const updated: FeedbackItem = await res.json();
    setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
    cancelFeedbackEdit();
  }

  async function deleteFeedback(id: string) {
    await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    setFeedback((prev) => prev.filter((f) => f.id !== id));
    if (editingFeedbackId === id) cancelFeedbackEdit();
  }

  // ── Idea helpers ──────────────────────────────────────────────────────────

  async function addIdea() {
    if (!ideaTitle.trim()) return;
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: ideaTitle.trim(), notes: ideaNotes.trim(), sourceUrl: null }),
    });
    const item: IdeaItem = await res.json();
    setIdeas((prev) => [item, ...prev]);
    setIdeaTitle(""); setIdeaNotes(""); setIdeaCaptureOpen(false);
  }

  function startIdeaEdit(item: IdeaItem) {
    setEditingIdeaId(item.id);
    setEditingIdeaTitle(item.title);
    setEditingIdeaNotes(item.notes);
    setOpenIdeaMenuId(null);
  }

  function cancelIdeaEdit() {
    setEditingIdeaId(null);
    setEditingIdeaTitle(""); setEditingIdeaNotes("");
  }

  async function saveIdeaEdit(id: string) {
    if (!editingIdeaTitle.trim()) return;
    const res = await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingIdeaTitle.trim(), notes: editingIdeaNotes.trim() }),
    });
    const updated: IdeaItem = await res.json();
    setIdeas((prev) => prev.map((i) => (i.id === id ? updated : i)));
    cancelIdeaEdit();
  }

  async function deleteIdea(id: string) {
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    setOpenIdeaMenuId((cur) => (cur === id ? null : cur));
    if (editingIdeaId === id) cancelIdeaEdit();
  }

  const actionQueue = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && t.dueAt)
      .sort((a, b) => +new Date(a.dueAt || 0) - +new Date(b.dueAt || 0))
      .slice(0, 8);
  }, [tasks]);

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-6 pb-10 md:px-12 pt-6">
        <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading…</div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-6 pb-10 md:px-12">
      {activeModule === "reminders" && (
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Execution Engine</p>
              <h2 className="font-display text-2xl font-semibold text-ink-900">Reminders and Follow-ups</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-mist-50 px-3 py-1 text-xs text-ink-500">Notifications: {notificationPermission}</span>
              <button type="button" onClick={() => Notification?.requestPermission().then(setNotificationPermission)} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500">Enable alerts</button>
            </div>
          </div>
          {reminderMessage && <p className="mt-3 text-sm text-accent-600">{reminderMessage}</p>}
          <div className="mt-4 grid gap-3">
            {actionQueue.length === 0 ? (
              <p className="text-sm text-ink-500">No due tasks in queue.</p>
            ) : (
              actionQueue.map((task) => (
                <article key={task.id} className="rounded-2xl border border-mist-200 bg-mist-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{task.title}</p>
                      <p className="text-xs text-ink-500">Due: {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due date"}</p>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-300">State: {followups[task.id] || (isTaskOverdue(task.dueAt, task.completed) ? "missed" : "open")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => snooze(task.id, 60)} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500">Snooze 1h</button>
                      <button type="button" onClick={() => moveLaterToday(task.id)} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500">Later today</button>
                      <button type="button" onClick={() => moveTomorrow(task.id)} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500">Tomorrow</button>
                      <button type="button" onClick={() => markDone(task.id)} className="rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white hover:bg-accent-600">Done</button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeModule === "feedback" && (
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Create new</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">New feedback item</h3>
          </div>
          <div className="mt-3 space-y-2">
            <input value={feedbackFrom} onChange={(e) => setFeedbackFrom(e.target.value)} placeholder="Who gave this feedback?" className="w-full rounded-xl border border-mist-200 bg-mist-50 px-3 py-2 text-sm outline-none focus:border-accent-500" />
            <MarkdownEditor value={feedbackMessage} onChange={setFeedbackMessage} placeholder="What did they say?" minHeight={140} />
            <input type="datetime-local" value={feedbackDueAt} onChange={(e) => setFeedbackDueAt(e.target.value)} className="w-full rounded-xl border border-mist-200 bg-mist-50 px-3 py-2 text-sm outline-none focus:border-accent-500" />
            <button type="button" onClick={addFeedback} className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600">Add feedback</button>
          </div>
          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Existing</p>
            <h4 className="mt-2 text-lg font-semibold text-ink-900">Captured feedback</h4>
          </div>
          <div className="mt-4 space-y-2">
            {feedback.length === 0 ? (
              <p className="text-sm text-ink-500">No feedback captured yet.</p>
            ) : (
              feedback.map((item) => (
                <article key={item.id} className="rounded-xl border border-mist-200 bg-mist-50 p-3">
                  {editingFeedbackId === item.id ? (
                    <div className="space-y-2">
                      <input value={editingFeedbackFrom} onChange={(e) => setEditingFeedbackFrom(e.target.value)} className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500" />
                      <MarkdownEditor value={editingFeedbackMsg} onChange={setEditingFeedbackMsg} minHeight={140} />
                      <input type="datetime-local" value={editingFeedbackDueAt} onChange={(e) => setEditingFeedbackDueAt(e.target.value)} className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500" />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveFeedbackEdit(item.id)} className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600">Save</button>
                        <button type="button" onClick={cancelFeedbackEdit} className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500">Cancel</button>
                        <button type="button" onClick={() => deleteFeedback(item.id)} className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-red-500">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink-900">{item.from}</p>
                          <RenderedMarkdown source={item.message} className="markdown-rendered mt-1" />
                          <p className="mt-1 text-xs text-ink-300">{new Date(item.receivedAt).toLocaleString()}</p>
                        </div>
                        <button type="button" onClick={() => startFeedbackEdit(item)} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500">Edit</button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["new", "planned", "in-progress", "done"] as const).map((status) => (
                          <button key={status} type="button" onClick={() => updateFeedbackStatus(item.id, status)} className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${item.status === status ? "border-accent-500 text-accent-600" : "border-mist-200 text-ink-400"}`}>{status}</button>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}

      {activeModule === "ideas" && (
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Create new</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">New idea</h3>
            </div>
            {!ideaCaptureOpen && (
              <button type="button" onClick={() => setIdeaCaptureOpen(true)} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500">Quick capture (Cmd/Ctrl+Shift+I)</button>
            )}
          </div>
          {ideaCaptureOpen && (
            <div className="mt-3 space-y-2 rounded-xl border border-mist-200 bg-mist-50 p-3">
              <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="Idea title" className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500" />
              <MarkdownEditor value={ideaNotes} onChange={setIdeaNotes} placeholder="Optional notes" minHeight={140} />
              <div className="flex gap-2">
                <button type="button" onClick={addIdea} className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600">Save idea</button>
                <button type="button" onClick={() => setIdeaCaptureOpen(false)} className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500">Close</button>
              </div>
            </div>
          )}
          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Existing</p>
            <h4 className="mt-2 text-lg font-semibold text-ink-900">Captured ideas</h4>
          </div>
          <div className="mt-4 space-y-2">
            {ideas.length === 0 ? (
              <p className="text-sm text-ink-500">No ideas captured yet.</p>
            ) : (
              ideas.map((item) => (
                <article key={item.id} className="relative rounded-xl border border-mist-200 bg-mist-50 p-3">
                  {editingIdeaId === item.id ? (
                    <div className="space-y-2">
                      <input value={editingIdeaTitle} onChange={(e) => setEditingIdeaTitle(e.target.value)} className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500" />
                      <MarkdownEditor value={editingIdeaNotes} onChange={setEditingIdeaNotes} minHeight={140} />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveIdeaEdit(item.id)} className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600">Save</button>
                        <button type="button" onClick={cancelIdeaEdit} className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500">Cancel</button>
                        <button type="button" onClick={() => deleteIdea(item.id)} className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="pr-12">
                      <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                      {item.notes && <RenderedMarkdown source={item.notes} className="markdown-rendered mt-1" />}
                      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent-600 hover:underline">Source page</a>}
                      <p className="mt-1 text-xs text-ink-300">{new Date(item.createdAt).toLocaleString()}</p>
                      <div className="absolute right-3 top-3">
                        <button type="button" onClick={() => setOpenIdeaMenuId((cur) => (cur === item.id ? null : item.id))} className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500" aria-label="Idea actions">...</button>
                        {openIdeaMenuId === item.id && (
                          <div className="absolute right-0 z-10 mt-2 min-w-[120px] rounded-xl border border-mist-200 bg-white p-1 shadow-card">
                            <button type="button" onClick={() => startIdeaEdit(item)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-ink-500 hover:bg-mist-50">Edit</button>
                            <button type="button" onClick={() => deleteIdea(item.id)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50">Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
