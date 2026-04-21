"use client";

import { useEffect, useMemo } from "react";

import { renderMarkdownDocument } from "@/lib/markdown";

export default function RenderedMarkdown({
  source,
  className = "markdown-rendered"
}: {
  source: string;
  className?: string;
}) {
  const html = useMemo(() => renderMarkdownDocument(source), [source]);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      if (!html.includes("mermaid-block")) return;
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "default"
      });

      const blocks = Array.from(document.querySelectorAll<HTMLElement>(".mermaid-block"));
      for (const block of blocks) {
        if (cancelled || block.dataset.rendered === "true") continue;
        const encoded = block.getAttribute("data-mermaid-source");
        if (!encoded) continue;
        const sourceText = decodeURIComponent(encoded);
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        try {
          const result = await mermaid.render(id, sourceText);
          block.innerHTML = result.svg;
          block.dataset.rendered = "true";
        } catch {
          block.innerHTML = `<pre class="mermaid-error">${sourceText}</pre>`;
        }
      }
    }

    renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [html]);

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
