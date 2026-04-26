"use client";

import { useEffect, useMemo, useState } from "react";

import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";
import { cancelNotifications, getReminderWindows, scheduleNotifications } from "@/lib/notifications";

type LocalTask = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  pinned: boolean;
  dueAt: string | null;
  createdAt: number;
};

type FollowUpState = "open" | "later" | "snoozed" | "missed" | "done";

type ReminderMeta = {
  preDueSentAt?: number;
  lastEscalationAt?: number;
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
  createdAt: number;
};

const TASK_STORAGE_KEY = "focus-tasks-v1";
const FOLLOWUP_STORAGE_KEY = "focus-task-followups-v1";
const REMINDER_STORAGE_KEY = "focus-task-reminder-meta-v1";
const FEEDBACK_STORAGE_KEY = "focus-feedback-v1";
const IDEAS_STORAGE_KEY = "focus-ideas-v1";

type ProductivityModule = "reminders" | "feedback" | "ideas";

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function updateTask(taskId: string, updater: (task: LocalTask) => LocalTask) {
  const tasks = readJson<LocalTask[]>(TASK_STORAGE_KEY, []);
  const next = tasks.map((task) => (task.id === taskId ? updater(task) : task));
  writeJson(TASK_STORAGE_KEY, next);
  window.dispatchEvent(new Event("focus-tasks-updated"));
}

function isTaskOverdue(task: LocalTask) {
  if (!task.dueAt || task.completed) return false;
  const due = new Date(task.dueAt).getTime();
  return Number.isFinite(due) && due < Date.now();
}

export default function ProductivityLayer({
  activeModule
}: {
  activeModule: ProductivityModule;
}) {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [followups, setFollowups] = useState<Record<string, FollowUpState>>({});
  const [reminderMeta, setReminderMeta] = useState<Record<string, ReminderMeta>>({});
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  const [feedbackFrom, setFeedbackFrom] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackDueAt, setFeedbackDueAt] = useState("");
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingFeedbackFrom, setEditingFeedbackFrom] = useState("");
  const [editingFeedbackMessage, setEditingFeedbackMessage] = useState("");
  const [editingFeedbackDueAt, setEditingFeedbackDueAt] = useState("");

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [ideaCaptureOpen, setIdeaCaptureOpen] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingIdeaTitle, setEditingIdeaTitle] = useState("");
  const [editingIdeaNotes, setEditingIdeaNotes] = useState("");
  const [openIdeaMenuId, setOpenIdeaMenuId] = useState<string | null>(null);

  function reload() {
    setTasks(readJson<LocalTask[]>(TASK_STORAGE_KEY, []));
    setFollowups(readJson<Record<string, FollowUpState>>(FOLLOWUP_STORAGE_KEY, {}));
    setReminderMeta(readJson<Record<string, ReminderMeta>>(REMINDER_STORAGE_KEY, {}));
    setFeedback(readJson<FeedbackItem[]>(FEEDBACK_STORAGE_KEY, []));
    setIdeas(readJson<IdeaItem[]>(IDEAS_STORAGE_KEY, []));
  }

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener("focus-tasks-updated", onUpdate);
    return () => window.removeEventListener("focus-tasks-updated", onUpdate);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const taskList = readJson<LocalTask[]>(TASK_STORAGE_KEY, []);
      const followupMap = readJson<Record<string, FollowUpState>>(FOLLOWUP_STORAGE_KEY, {});
      const reminderMap = readJson<Record<string, ReminderMeta>>(REMINDER_STORAGE_KEY, {});
      const now = Date.now();

      let updated = false;
      let latestMessage: string | null = null;

      for (const task of taskList) {
        if (!task.dueAt || task.completed) continue;
        const due = new Date(task.dueAt).getTime();
        if (!Number.isFinite(due)) continue;

        const meta = reminderMap[task.id] || {};
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
          const escalationInterval = 60 * 60 * 1000;
          if (!meta.lastEscalationAt || now - meta.lastEscalationAt > escalationInterval) {
            latestMessage = `Escalation: ${task.title} is overdue.`;
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("Overdue task", { body: latestMessage });
            }
            reminderMap[task.id] = { ...reminderMap[task.id], lastEscalationAt: now };
            if (followupMap[task.id] === "open" || !followupMap[task.id]) {
              followupMap[task.id] = "missed";
              // Schedule a push notification for the next escalation in 1 hour
              scheduleNotifications({
                sourceId: task.id,
                sourceType: "reminder",
                title: `Still overdue: ${task.title}`,
                dueAt: new Date(now + escalationInterval).toISOString(),
                reminderWindows: [0]
              });
            }
            updated = true;
          }
        }
      }

      if (updated) {
        writeJson(REMINDER_STORAGE_KEY, reminderMap);
        writeJson(FOLLOWUP_STORAGE_KEY, followupMap);
        setReminderMeta(reminderMap);
        setFollowups(followupMap);
        if (latestMessage) setReminderMessage(latestMessage);
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      const isCapture = (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "i";
      if (!isCapture) return;
      event.preventDefault();
      setIdeaCaptureOpen(true);
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") !== "1") return;

    const title = (params.get("title") || "Captured from browser").trim();
    const sourceUrl = (params.get("url") || "").trim();
    const notes = (params.get("notes") || "").trim();

    const idea: IdeaItem = {
      id: id(),
      title,
      notes,
      sourceUrl: sourceUrl || null,
      createdAt: Date.now()
    };

    const current = readJson<IdeaItem[]>(IDEAS_STORAGE_KEY, []);
    writeJson(IDEAS_STORAGE_KEY, [idea, ...current]);
    setIdeas([idea, ...current]);

    params.delete("capture");
    params.delete("title");
    params.delete("url");
    params.delete("notes");
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  function setFollowup(taskId: string, state: FollowUpState) {
    const next = { ...followups, [taskId]: state };
    setFollowups(next);
    writeJson(FOLLOWUP_STORAGE_KEY, next);
  }

  function rescheduleTaskNotifications(taskId: string, newDueAt: string) {
    const taskList = readJson<LocalTask[]>(TASK_STORAGE_KEY, []);
    const task = taskList.find((t) => t.id === taskId);
    if (!task) return;
    cancelNotifications(taskId).then(() => {
      scheduleNotifications({
        sourceId: taskId,
        sourceType: "task",
        title: task.title,
        dueAt: newDueAt,
        reminderWindows: getReminderWindows()
      });
    });
  }

  function snooze(taskId: string, minutes: number) {
    const newDueAt = new Date(Date.now() + minutes * 60_000).toISOString();
    updateTask(taskId, (task) => ({ ...task, dueAt: newDueAt }));
    setFollowup(taskId, "snoozed");
    setReminderMessage(`Snoozed for ${minutes} minutes.`);
    rescheduleTaskNotifications(taskId, newDueAt);
  }

  function moveLaterToday(taskId: string) {
    const now = new Date();
    const target = new Date();
    target.setHours(Math.max(now.getHours() + 2, 17), 0, 0, 0);
    const newDueAt = target.toISOString();
    updateTask(taskId, (task) => ({ ...task, dueAt: newDueAt }));
    setFollowup(taskId, "later");
    setReminderMessage("Moved to later today.");
    rescheduleTaskNotifications(taskId, newDueAt);
  }

  function moveTomorrow(taskId: string) {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(10, 0, 0, 0);
    const newDueAt = target.toISOString();
    updateTask(taskId, (task) => ({ ...task, dueAt: newDueAt }));
    setFollowup(taskId, "later");
    setReminderMessage("Moved to tomorrow 10:00 AM.");
    rescheduleTaskNotifications(taskId, newDueAt);
  }

  function markDone(taskId: string) {
    updateTask(taskId, (task) => ({ ...task, completed: true }));
    setFollowup(taskId, "done");
    cancelNotifications(taskId);
  }

  function requestNotifications() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
    });
  }

  function addFeedback() {
    if (!feedbackFrom.trim() || !feedbackMessage.trim()) return;
    const item: FeedbackItem = {
      id: id(),
      from: feedbackFrom.trim(),
      message: feedbackMessage.trim(),
      receivedAt: new Date().toISOString(),
      dueAt: feedbackDueAt ? new Date(feedbackDueAt).toISOString() : null,
      status: "new"
    };
    const next = [item, ...feedback];
    setFeedback(next);
    writeJson(FEEDBACK_STORAGE_KEY, next);
    setFeedbackFrom("");
    setFeedbackMessage("");
    setFeedbackDueAt("");
  }

  function updateFeedbackStatus(idValue: string, status: FeedbackItem["status"]) {
    const next = feedback.map((item) => (item.id === idValue ? { ...item, status } : item));
    setFeedback(next);
    writeJson(FEEDBACK_STORAGE_KEY, next);
  }

  function startFeedbackEdit(item: FeedbackItem) {
    setEditingFeedbackId(item.id);
    setEditingFeedbackFrom(item.from);
    setEditingFeedbackMessage(item.message);
    setEditingFeedbackDueAt(item.dueAt ? item.dueAt.slice(0, 16) : "");
  }

  function cancelFeedbackEdit() {
    setEditingFeedbackId(null);
    setEditingFeedbackFrom("");
    setEditingFeedbackMessage("");
    setEditingFeedbackDueAt("");
  }

  function saveFeedbackEdit(idValue: string) {
    if (!editingFeedbackFrom.trim() || !editingFeedbackMessage.trim()) return;
    const next = feedback.map((item) =>
      item.id === idValue
        ? {
            ...item,
            from: editingFeedbackFrom.trim(),
            message: editingFeedbackMessage.trim(),
            dueAt: editingFeedbackDueAt ? new Date(editingFeedbackDueAt).toISOString() : null
          }
        : item
    );
    setFeedback(next);
    writeJson(FEEDBACK_STORAGE_KEY, next);
    cancelFeedbackEdit();
  }

  function deleteFeedback(idValue: string) {
    const next = feedback.filter((item) => item.id !== idValue);
    setFeedback(next);
    writeJson(FEEDBACK_STORAGE_KEY, next);
    if (editingFeedbackId === idValue) {
      cancelFeedbackEdit();
    }
  }

  function addIdea() {
    if (!ideaTitle.trim()) return;
    const item: IdeaItem = {
      id: id(),
      title: ideaTitle.trim(),
      notes: ideaNotes.trim(),
      sourceUrl: null,
      createdAt: Date.now()
    };
    const next = [item, ...ideas];
    setIdeas(next);
    writeJson(IDEAS_STORAGE_KEY, next);
    setIdeaTitle("");
    setIdeaNotes("");
    setIdeaCaptureOpen(false);
  }

  function startIdeaEdit(item: IdeaItem) {
    setEditingIdeaId(item.id);
    setEditingIdeaTitle(item.title);
    setEditingIdeaNotes(item.notes);
    setOpenIdeaMenuId(null);
  }

  function cancelIdeaEdit() {
    setEditingIdeaId(null);
    setEditingIdeaTitle("");
    setEditingIdeaNotes("");
  }

  function saveIdeaEdit(idValue: string) {
    if (!editingIdeaTitle.trim()) return;
    const next = ideas.map((item) =>
      item.id === idValue
        ? { ...item, title: editingIdeaTitle.trim(), notes: editingIdeaNotes.trim() }
        : item
    );
    setIdeas(next);
    writeJson(IDEAS_STORAGE_KEY, next);
    cancelIdeaEdit();
  }

  function deleteIdea(idValue: string) {
    const next = ideas.filter((item) => item.id !== idValue);
    setIdeas(next);
    writeJson(IDEAS_STORAGE_KEY, next);
    setOpenIdeaMenuId((current) => (current === idValue ? null : current));
    if (editingIdeaId === idValue) {
      cancelIdeaEdit();
    }
  }

  const actionQueue = useMemo(() => {
    return tasks
      .filter((task) => !task.completed && task.dueAt)
      .sort((a, b) => +new Date(a.dueAt || 0) - +new Date(b.dueAt || 0))
      .slice(0, 8);
  }, [tasks]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-6 pb-10 md:px-12">
      {activeModule === "reminders" ? (
        <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Execution Engine</p>
            <h2 className="font-display text-2xl font-semibold text-ink-900">Reminders and Follow-ups</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mist-50 px-3 py-1 text-xs text-ink-500">
              Notifications: {notificationPermission}
            </span>
            <button
              type="button"
              onClick={requestNotifications}
              className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
            >
              Enable alerts
            </button>
          </div>
        </div>
        {reminderMessage ? <p className="mt-3 text-sm text-accent-600">{reminderMessage}</p> : null}
        <div className="mt-4 grid gap-3">
          {actionQueue.length === 0 ? (
            <p className="text-sm text-ink-500">No due tasks in queue.</p>
          ) : (
            actionQueue.map((task) => (
              <article key={task.id} className="rounded-2xl border border-mist-200 bg-mist-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{task.title}</p>
                    <p className="text-xs text-ink-500">
                      Due: {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No due date"}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink-300">
                      State: {followups[task.id] || (isTaskOverdue(task) ? "missed" : "open")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => snooze(task.id, 60)}
                      className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                    >
                      Snooze 1h
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLaterToday(task.id)}
                      className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                    >
                      Later today
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTomorrow(task.id)}
                      className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => markDone(task.id)}
                      className="rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white hover:bg-accent-600"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
      ) : null}

      {activeModule === "feedback" ? (
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Create new</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">New feedback item</h3>
          </div>
          <div className="mt-3 space-y-2">
            <input
              value={feedbackFrom}
              onChange={(event) => setFeedbackFrom(event.target.value)}
              placeholder="Who gave this feedback?"
              className="w-full rounded-xl border border-mist-200 bg-mist-50 px-3 py-2 text-sm outline-none focus:border-accent-500"
            />
            <MarkdownEditor
              value={feedbackMessage}
              onChange={setFeedbackMessage}
              placeholder="What did they say?"
              minHeight={140}
            />
            <input
              type="datetime-local"
              value={feedbackDueAt}
              onChange={(event) => setFeedbackDueAt(event.target.value)}
              className="w-full rounded-xl border border-mist-200 bg-mist-50 px-3 py-2 text-sm outline-none focus:border-accent-500"
            />
            <button
              type="button"
              onClick={addFeedback}
              className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600"
            >
              Add feedback
            </button>
          </div>
          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Existing</p>
            <h4 className="mt-2 text-lg font-semibold text-ink-900">Captured feedback</h4>
          </div>
          <div className="mt-4 space-y-2">
            {feedback.length === 0 ? (
              <p className="text-sm text-ink-500">No feedback captured yet.</p>
            ) : (
              feedback.slice(0, 8).map((item) => (
                <article key={item.id} className="rounded-xl border border-mist-200 bg-mist-50 p-3">
                  {editingFeedbackId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingFeedbackFrom}
                        onChange={(event) => setEditingFeedbackFrom(event.target.value)}
                        className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
                      />
                      <MarkdownEditor
                        value={editingFeedbackMessage}
                        onChange={setEditingFeedbackMessage}
                        minHeight={140}
                      />
                      <input
                        type="datetime-local"
                        value={editingFeedbackDueAt}
                        onChange={(event) => setEditingFeedbackDueAt(event.target.value)}
                        className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveFeedbackEdit(item.id)}
                          className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelFeedbackEdit}
                          className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFeedback(item.id)}
                          className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink-900">{item.from}</p>
                          <RenderedMarkdown source={item.message} className="markdown-rendered mt-1" />
                          <p className="mt-1 text-xs text-ink-300">
                            {new Date(item.receivedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startFeedbackEdit(item)}
                            className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["new", "planned", "in-progress", "done"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => updateFeedbackStatus(item.id, status)}
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                              item.status === status
                                ? "border-accent-500 text-accent-600"
                                : "border-mist-200 text-ink-400"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}

      {activeModule === "ideas" ? (
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Create new</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink-900">New idea</h3>
            </div>
            {!ideaCaptureOpen ? (
              <button
                type="button"
                onClick={() => setIdeaCaptureOpen(true)}
                className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Quick capture (Cmd/Ctrl+Shift+I)
              </button>
            ) : null}
          </div>
          {ideaCaptureOpen ? (
            <div className="mt-3 space-y-2 rounded-xl border border-mist-200 bg-mist-50 p-3">
              <input
                value={ideaTitle}
                onChange={(event) => setIdeaTitle(event.target.value)}
                placeholder="Idea title"
                className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
              <MarkdownEditor
                value={ideaNotes}
                onChange={setIdeaNotes}
                placeholder="Optional notes"
                minHeight={140}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addIdea}
                  className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600"
                >
                  Save idea
                </button>
                <button
                  type="button"
                  onClick={() => setIdeaCaptureOpen(false)}
                  className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Existing</p>
            <h4 className="mt-2 text-lg font-semibold text-ink-900">Captured ideas</h4>
          </div>
          <div className="mt-4 space-y-2">
            {ideas.length === 0 ? (
              <p className="text-sm text-ink-500">No ideas captured yet.</p>
            ) : (
              ideas.slice(0, 10).map((item) => (
                <article key={item.id} className="relative rounded-xl border border-mist-200 bg-mist-50 p-3">
                  {editingIdeaId === item.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingIdeaTitle}
                        onChange={(event) => setEditingIdeaTitle(event.target.value)}
                        className="w-full rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
                      />
                      <MarkdownEditor
                        value={editingIdeaNotes}
                        onChange={setEditingIdeaNotes}
                        minHeight={140}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveIdeaEdit(item.id)}
                          className="rounded-xl bg-accent-500 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-600"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelIdeaEdit}
                          className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteIdea(item.id)}
                          className="rounded-xl border border-mist-200 px-3 py-2 text-xs font-semibold text-ink-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pr-12">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                          {item.notes ? (
                            <RenderedMarkdown source={item.notes} className="markdown-rendered mt-1" />
                          ) : null}
                          {item.sourceUrl ? (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs text-accent-600 hover:underline"
                            >
                              Source page
                            </a>
                          ) : null}
                          <p className="mt-1 text-xs text-ink-300">{new Date(item.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="absolute right-3 top-3">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenIdeaMenuId((current) => (current === item.id ? null : item.id))
                            }
                            className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                            aria-label="Idea actions"
                          >
                            ...
                          </button>
                          {openIdeaMenuId === item.id ? (
                            <div className="absolute right-0 z-10 mt-2 min-w-[120px] rounded-xl border border-mist-200 bg-white p-1 shadow-card">
                              <button
                                type="button"
                                onClick={() => startIdeaEdit(item)}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-ink-500 hover:bg-mist-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteIdea(item.id)}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
