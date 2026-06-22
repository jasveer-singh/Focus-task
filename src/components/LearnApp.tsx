"use client";

import { useEffect, useState } from "react";

import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";
import LearningPlans from "@/components/LearningPlans";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  notes: string;
  read: boolean;
  createdAt: string;
};

type Tab = "articles" | "plans";

export default function LearnApp() {
  const [tab, setTab] = useState<Tab>("articles");

  return (
    <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
      {/* Header */}
      <header className="flex flex-col gap-6 border-b border-hairline pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Read &amp; grow</p>
          <h1 className="mt-2 font-display text-4xl font-normal tracking-[-1px] text-ink md:text-5xl">Learn</h1>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {([["articles", "Reading list"], ["plans", "Learning plans"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === key ? "bg-coral text-white" : "text-ink-muted hover:bg-surface-card"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "articles" ? <ArticlesTab /> : <LearningPlans />}
    </section>
  );
}

// ── Reading list ────────────────────────────────────────────────────────────

function ArticlesTab() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function addArticle() {
    if (!url.trim()) return;
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), title: title.trim(), notes: notes.trim() }),
    });
    if (!res.ok) return;
    const article: Article = await res.json();
    setArticles((prev) => [article, ...prev]);
    setUrl(""); setTitle(""); setNotes(""); setShowForm(false);
  }

  async function patchArticle(id: string, patch: Partial<Article>) {
    const res = await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const updated: Article = await res.json();
    setArticles((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }

  async function remove(id: string) {
    await fetch(`/api/articles/${id}`, { method: "DELETE" });
    setArticles((prev) => prev.filter((x) => x.id !== id));
  }

  const unread = articles.filter((a) => !a.read);
  const read = articles.filter((a) => a.read);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <span className="rounded-pill border border-hairline bg-surface-card px-3 py-1.5 text-xs font-medium text-ink-muted">
          {unread.length} to read
        </span>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Save article
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-hairline bg-surface-card/60 p-5 animate-fade flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Link (URL)</label>
            <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-coral" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Title (optional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is this about?" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-coral" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Why save it? (optional)</label>
            <MarkdownEditor value={notes} onChange={setNotes} placeholder="Notes — Markdown supported…" minHeight={80} />
          </div>
          <div className="flex justify-end gap-2 border-t border-hairline pt-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted hover:border-coral hover:text-coral">Cancel</button>
            <button type="button" onClick={addArticle} className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white hover:bg-coral-active">Save</button>
          </div>
        </div>
      )}

      {articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-ink-soft">
          Nothing saved yet. Paste a link above to start your reading list.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {unread.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">To read</p>
              {unread.map((a) => <ArticleCard key={a.id} article={a} onPatch={patchArticle} onRemove={remove} />)}
            </div>
          )}
          {read.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">Done</p>
              {read.map((a) => <ArticleCard key={a.id} article={a} onPatch={patchArticle} onRemove={remove} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ArticleCard({
  article,
  onPatch,
  onRemove,
}: {
  article: Article;
  onPatch: (id: string, patch: Partial<Article>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(article.title);
  const [url, setUrl] = useState(article.url);
  const [notes, setNotes] = useState(article.notes);

  function save() {
    if (!url.trim()) return;
    onPatch(article.id, { title: title.trim() || url.trim(), url: url.trim(), notes: notes.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <article className="rounded-lg border border-coral/40 bg-canvas p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-coral" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Link (URL)</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-coral" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Notes</label>
          <MarkdownEditor value={notes} onChange={setNotes} placeholder="Notes — Markdown supported…" minHeight={70} />
        </div>
        <div className="flex justify-end gap-2 border-t border-hairline pt-3">
          <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-hairline px-4 py-1.5 text-xs font-medium text-ink-muted hover:border-coral hover:text-coral">Cancel</button>
          <button type="button" onClick={save} className="rounded-md bg-coral px-4 py-1.5 text-xs font-medium text-white hover:bg-coral-active">Save</button>
        </div>
      </article>
    );
  }

  return (
    <article className={`rounded-lg border bg-canvas p-5 transition ${article.read ? "border-hairline opacity-60" : "border-hairline hover:border-coral/40"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onPatch(article.id, { read: !article.read })}
            title={article.read ? "Mark unread" : "Mark read"}
            className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition flex items-center justify-center ${article.read ? "border-coral bg-coral" : "border-hairline hover:border-coral"}`}
          >
            {article.read && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l3 3 4-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          <div className="min-w-0">
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className={`text-sm font-medium leading-snug text-ink transition hover:text-coral ${article.read ? "line-through text-ink-soft" : ""}`}
            >
              {article.title}
            </a>
            {/* Visible link */}
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center gap-1 text-xs text-coral/80 hover:text-coral break-all"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="shrink-0"><path d="M6 10a3 3 0 0 0 4 0l2-2a3 3 0 0 0-4-4l-1 1M10 6a3 3 0 0 0-4 0L4 8a3 3 0 0 0 4 4l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              {article.url}
            </a>
            {article.source && (
              <span className="mt-1.5 inline-flex items-center rounded-pill border border-hairline px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                {article.source}
              </span>
            )}
            {article.notes && <div className="mt-2"><RenderedMarkdown source={article.notes} className="markdown-rendered text-xs text-ink-muted leading-relaxed" /></div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onRemove(article.id)}
            className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-coral"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
