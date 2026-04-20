"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  EMOJI_ALIASES,
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

function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  left: string,
  right: string,
  fallback: string
) {
  const selected = value.slice(selectionStart, selectionEnd);
  const content = selected || fallback;
  const nextValue = `${value.slice(0, selectionStart)}${left}${content}${right}${value.slice(selectionEnd)}`;
  return {
    nextValue,
    nextSelectionStart: selectionStart + left.length,
    nextSelectionEnd: selectionStart + left.length + content.length
  };
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
  const [enableScripts, setEnableScripts] = useState(true);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiRange, setEmojiRange] = useState<{ start: number; end: number } | null>(null);
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

  const html = useMemo(
    () => renderMarkdownToHtml(value, { enableScripts }),
    [enableScripts, value]
  );

  const emojiSuggestions = useMemo(() => {
    if (!emojiQuery) return Object.entries(EMOJI_ALIASES).slice(0, 6);
    return Object.entries(EMOJI_ALIASES)
      .filter(([alias]) => alias.startsWith(emojiQuery.toLowerCase()))
      .slice(0, 6);
  }, [emojiQuery]);

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

  function updateEmojiState() {
    const element = textareaRef.current;
    if (!element) return;
    const cursor = element.selectionStart ?? 0;
    const before = value.slice(0, cursor);
    const match = before.match(/(^|\s):([a-z_]*)$/i);
    if (!match) {
      setEmojiQuery("");
      setEmojiRange(null);
      return;
    }

    const aliasStart = cursor - match[0].length + match[1].length;
    setEmojiQuery(match[2] || "");
    setEmojiRange({ start: aliasStart, end: cursor });
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

  function applyWrappedText(left: string, right: string, fallback: string) {
    const element = textareaRef.current;
    if (!element) return;
    const selectionStart = element.selectionStart ?? value.length;
    const selectionEnd = element.selectionEnd ?? value.length;
    const result = wrapSelection(value, selectionStart, selectionEnd, left, right, fallback);
    updateValue(result.nextValue);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      target.focus();
      target.setSelectionRange(result.nextSelectionStart, result.nextSelectionEnd);
      updateActiveLine();
      updateEmojiState();
    });
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
    requestAnimationFrame(() => {
      updateActiveLine();
      updateEmojiState();
    });
  }

  function insertEmoji(emoji: string) {
    if (!emojiRange) return;
    const nextValue = `${value.slice(0, emojiRange.start)}${emoji}${value.slice(emojiRange.end)}`;
    updateValue(nextValue);
    setEmojiQuery("");
    setEmojiRange(null);
    requestAnimationFrame(() => {
      const target = textareaRef.current;
      if (!target) return;
      const cursor = emojiRange.start + emoji.length;
      target.focus();
      target.setSelectionRange(cursor, cursor);
      updateActiveLine();
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier) {
      if (/^[0-6]$/.test(event.key)) {
        event.preventDefault();
        if (event.key === "0") {
          clearHeading();
        } else {
          applyHeading(Number(event.key));
        }
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        applyWrappedText("**", "**", "Bold text");
        return;
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        applyWrappedText("*", "*", "Italic text");
        return;
      }
    }

    if (event.key === "Escape") {
      setEmojiQuery("");
      setEmojiRange(null);
    }

    if (event.key === "Enter" && emojiRange && emojiSuggestions.length > 0) {
      event.preventDefault();
      insertEmoji(emojiSuggestions[0][1]);
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
            onClick={() => applyWrappedText("**", "**", "Bold text")}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => applyWrappedText("*", "*", "Italic text")}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => applyWrappedText("~~", "~~", "Struck through text")}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Strike
          </button>
          <button
            type="button"
            onClick={() => applyWrappedText("==", "==", "Highlighted text")}
            className="rounded-full border border-mist-200 bg-white px-2 py-1 text-[11px] font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
          >
            Highlight
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
          <button
            type="button"
            onClick={() => applyWrappedText("~", "~", "2")}
            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
              enableScripts
                ? "border-accent-500 bg-accent-500 text-white"
                : "border-mist-200 bg-white text-ink-500 hover:border-accent-500 hover:text-accent-500"
            }`}
          >
            Sub
          </button>
          <button
            type="button"
            onClick={() => applyWrappedText("^", "^", "2")}
            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
              enableScripts
                ? "border-accent-500 bg-accent-500 text-white"
                : "border-mist-200 bg-white text-ink-500 hover:border-accent-500 hover:text-accent-500"
            }`}
          >
            Sup
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-300">
            Line {editorState.activeLine}
          </span>
          <button
            type="button"
            onClick={() => setEnableScripts((current) => !current)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              enableScripts
                ? "bg-accent-500 text-white"
                : "border border-mist-200 bg-white text-ink-500"
            }`}
          >
            Scripts
          </button>
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
            updateEmojiState();
          }}
          onKeyDown={onKeyDown}
          onClick={updateActiveLine}
          onKeyUp={() => {
            updateActiveLine();
            updateEmojiState();
          }}
          onSelect={() => {
            updateActiveLine();
            updateEmojiState();
          }}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full resize-none overflow-hidden rounded-b-2xl bg-mist-50 px-4 py-3 text-sm text-ink-700 outline-none"
        />
      ) : (
        <div className="min-h-[140px] rounded-b-2xl px-4 py-3">
          {value.trim() ? (
            <div
              className="markdown-rendered"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p className="text-sm text-ink-300">{placeholder}</p>
          )}
        </div>
      )}

      {editorState.renderMode === "source" && emojiRange && emojiSuggestions.length > 0 ? (
        <div className="border-t border-mist-200 bg-white px-3 py-2">
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ink-300">Emoji</p>
          <div className="flex flex-wrap gap-2">
            {emojiSuggestions.map(([alias, emoji]) => (
              <button
                key={alias}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="rounded-full border border-mist-200 bg-mist-50 px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                {emoji} :{alias}:
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
