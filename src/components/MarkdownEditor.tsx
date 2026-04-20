"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  type MarkdownEditorState,
  type MarkdownRenderMode,
  parseMarkdownAst,
  renderMarkdownToHtml
} from "@/lib/markdown";

function applyToSelectedLines(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  mapper: (line: string) => string
) {
  const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const blockEndIndex = value.indexOf("\n", selectionEnd);
  const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex;
  const block = value.slice(blockStart, blockEnd);
  const nextBlock = block
    .split("\n")
    .map((line) => mapper(line))
    .join("\n");
  const nextValue = `${value.slice(0, blockStart)}${nextBlock}${value.slice(blockEnd)}`;
  return {
    nextValue,
    nextSelectionStart: blockStart,
    nextSelectionEnd: blockStart + nextBlock.length
  };
}

function autoResize(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, 140)}px`;
}

function getActiveLine(value: string, cursorPosition: number) {
  return value.slice(0, cursorPosition).split("\n").length;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editorState, setEditorState] = useState<MarkdownEditorState>({
    source: value,
    ast: parseMarkdownAst(value),
    activeLine: 1,
    renderMode: "source"
  });

  useEffect(() => {
    setEditorState((current) => ({
      ...current,
      source: value,
      ast: parseMarkdownAst(value)
    }));
  }, [value]);

  useEffect(() => {
    autoResize(textareaRef.current);
  }, [value, minHeight]);

  const html = useMemo(() => renderMarkdownToHtml(value), [value]);

  function updateValue(nextValue: string) {
    onChange(nextValue);
    setEditorState((current) => ({
      ...current,
      source: nextValue,
      ast: parseMarkdownAst(nextValue)
    }));
  }

  function updateActiveLine() {
    const element = textareaRef.current;
    if (!element) return;
    const line = getActiveLine(value, element.selectionStart ?? 0);
    setEditorState((current) => ({ ...current, activeLine: line }));
  }

  function runLineTransform(mapper: (line: string) => string) {
    const element = textareaRef.current;
    if (!element) return;
    const selectionStart = element.selectionStart ?? value.length;
    const selectionEnd = element.selectionEnd ?? value.length;
    const result = applyToSelectedLines(value, selectionStart, selectionEnd, mapper);
    updateValue(result.nextValue);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(result.nextSelectionStart, result.nextSelectionEnd);
      updateActiveLine();
    });
  }

  function applyHeading(level: number) {
    const prefix = `${"#".repeat(level)} `;
    runLineTransform((line) => {
      const stripped = line.replace(/^\s{0,3}#{1,6}\s+/, "");
      return stripped.trim() ? `${prefix}${stripped}` : prefix;
    });
  }

  function clearHeading() {
    runLineTransform((line) => line.replace(/^\s{0,3}#{1,6}\s+/, ""));
  }

  function prependPrefix(prefix: string, fallback: string) {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const selected = value.slice(start, end).trim();
    if (!selected) {
      const next = `${value.slice(0, start)}${prefix}${fallback}${value.slice(end)}`;
      updateValue(next);
      requestAnimationFrame(() => {
        const target = textareaRef.current;
        if (!target) return;
        const cursor = start + prefix.length;
        target.focus();
        target.setSelectionRange(cursor, cursor + fallback.length);
        updateActiveLine();
      });
      return;
    }
    runLineTransform((line) => `${prefix}${line}`);
  }

  function insertRule() {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? value.length;
    const next = `${value.slice(0, start)}\n---\n${value.slice(start)}`;
    updateValue(next);
  }

  function insertTaskItem() {
    prependPrefix("- [ ] ", "Task");
  }

  function insertLink() {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;
    const selected = value.slice(start, end).trim() || "link text";
    const rawUrl = window.prompt("Enter URL", "https://");
    if (!rawUrl) return;
    const url = /^(https?:\/\/|mailto:)/i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    const markdownLink = `[${selected}](${url})`;
    const next = `${value.slice(0, start)}${markdownLink}${value.slice(end)}`;
    updateValue(next);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier) return;

    if (/^[0-6]$/.test(event.key)) {
      event.preventDefault();
      if (event.key === "0") {
        clearHeading();
      } else {
        applyHeading(Number(event.key));
      }
    }
  }

  function setRenderMode(renderMode: MarkdownRenderMode) {
    setEditorState((current) => ({ ...current, renderMode }));
  }

  return (
    <div className="rounded-2xl border border-mist-200 bg-mist-50">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist-200 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => applyHeading(level)}
              className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
            >
              H{level}
            </button>
          ))}
          <button
            type="button"
            onClick={clearHeading}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => prependPrefix("- ", "List item")}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            List
          </button>
          <button
            type="button"
            onClick={insertTaskItem}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Task
          </button>
          <button
            type="button"
            onClick={() => prependPrefix("> ", "Quote")}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Quote
          </button>
          <button
            type="button"
            onClick={insertRule}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Rule
          </button>
          <button
            type="button"
            onClick={insertLink}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Link
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-300">
            Line {editorState.activeLine}
          </span>
          <button
            type="button"
            onClick={() => setRenderMode("source")}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              editorState.renderMode === "source"
                ? "bg-accent-500 text-white"
                : "border border-mist-200 bg-white text-ink-500"
            }`}
          >
            Source
          </button>
          <button
            type="button"
            onClick={() => setRenderMode("live")}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              editorState.renderMode === "live"
                ? "bg-accent-500 text-white"
                : "border border-mist-200 bg-white text-ink-500"
            }`}
          >
            Live
          </button>
        </div>
      </div>

      {editorState.renderMode === "source" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            updateValue(event.target.value);
            autoResize(event.currentTarget);
          }}
          onKeyDown={onKeyDown}
          onClick={updateActiveLine}
          onKeyUp={updateActiveLine}
          onSelect={updateActiveLine}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full resize-none overflow-hidden rounded-b-2xl bg-mist-50 px-4 py-3 text-sm text-ink-700 outline-none"
        />
      ) : (
        <div className="min-h-[140px] rounded-b-2xl px-4 py-3">
          {value.trim() ? (
            <div
              className="prose prose-sm max-w-none text-ink-700"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-ink-300">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
