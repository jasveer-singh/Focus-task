"use client";

import { useMemo } from "react";

import { renderMarkdownDocument } from "@/lib/markdown";

export default function RenderedMarkdown({
  source,
  className = "markdown-rendered"
}: {
  source: string;
  className?: string;
}) {
  const html = useMemo(() => renderMarkdownDocument(source), [source]);

  async function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (!target?.matches("[data-copy-button='true']")) return;

    const wrapper = target.closest("[data-raw-code]") as HTMLElement | null;
    const encoded = wrapper?.getAttribute("data-raw-code");
    if (!encoded) return;

    await navigator.clipboard.writeText(decodeURIComponent(encoded));
    const original = target.textContent;
    target.textContent = "Copied!";
    window.setTimeout(() => {
      target.textContent = original;
    }, 1500);
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} onClick={onClick} />;
}
