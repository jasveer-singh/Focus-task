import { unified } from "unified";
import hljs from "highlight.js";
import rehypeStringify from "rehype-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";

const parseProcessor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm);

const renderProcessor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

export type MarkdownRenderMode = "source" | "live";

export type MarkdownRenderOptions = {
  enableScripts?: boolean;
};

export type MarkdownEditorState = {
  source: string;
  ast: unknown;
  activeLine: number;
  renderMode: MarkdownRenderMode;
};

export const EMOJI_ALIASES: Record<string, string> = {
  smile: "😊",
  heart: "❤️",
  check: "✅",
  fire: "🔥",
  idea: "💡",
  warning: "⚠️"
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtml(input: string) {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function escapeAttribute(input: string) {
  return encodeURIComponent(input);
}

function protectCodeSegments(source: string) {
  const segments: string[] = [];
  const protectedSource = source.replace(/```[\s\S]*?```|``[^`]*``|`[^`]*`/g, (match) => {
    const token = `__CODE_SEGMENT_${segments.length}__`;
    segments.push(match);
    return token;
  });
  return { protectedSource, segments };
}

function restoreCodeSegments(source: string, segments: string[]) {
  return source.replace(/__CODE_SEGMENT_(\d+)__/g, (_, index) => segments[Number(index)] ?? "");
}

function applyInlineExtensions(source: string, options: MarkdownRenderOptions = {}) {
  const { protectedSource, segments } = protectCodeSegments(source);

  let transformed = protectedSource.replace(/==([^=\n][\s\S]*?[^=\n]?)==/g, "<mark>$1</mark>");
  transformed = transformed.replace(/:([a-z_+-]+):/gi, (match, alias) => {
    return EMOJI_ALIASES[alias.toLowerCase()] ?? match;
  });

  if (options.enableScripts !== false) {
    transformed = transformed.replace(/~([^\s~][^~]*?)~/g, "<sub>$1</sub>");
    transformed = transformed.replace(/\^([^\s^][^^]*?)\^/g, "<sup>$1</sup>");
  }

  return restoreCodeSegments(transformed, segments);
}

export function parseMarkdownAst(source: string) {
  return parseProcessor.parse(source);
}

export function renderMarkdownToHtml(
  source: string,
  options: MarkdownRenderOptions = {}
) {
  return String(renderProcessor.processSync(applyInlineExtensions(source, options)));
}

export function renderMarkdownDocument(
  source: string,
  options: MarkdownRenderOptions = {}
) {
  const html = renderMarkdownToHtml(source, options);

  return html.replace(
    /<pre><code(?: class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, className = "", escapedCode = "") => {
      const rawCode = decodeHtml(escapedCode);
      const languageMatch = className.match(/language-([a-z0-9_-]+)/i);
      const language = languageMatch?.[1]?.toLowerCase();

      let highlighted = "";
      if (language && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(rawCode, { language }).value;
      } else {
        const result = hljs.highlightAuto(rawCode);
        highlighted = result.value;
      }

      const lines = highlighted.split("\n");
      const wrappedLines = lines
        .map((line) => `<span class="line">${line || " "}</span>`)
        .join("\n");
      const codeClasses = ["hljs", className].filter(Boolean).join(" ");

      return [
        `<div class="code-block" data-raw-code="${escapeAttribute(rawCode)}">`,
        `<button type="button" class="code-copy-button" data-copy-button="true">Copy</button>`,
        "<pre>",
        `<code class="${codeClasses}">${wrappedLines}</code>`,
        "</pre>",
        "</div>"
      ].join("");
    }
  );
}

export function extractMarkdownUrls(input: string) {
  const matches = input.match(/https?:\/\/[^\s<]+/g) || [];
  return Array.from(new Set(matches));
}
