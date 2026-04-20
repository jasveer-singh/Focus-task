import { unified } from "unified";
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

export function extractMarkdownUrls(input: string) {
  const matches = input.match(/https?:\/\/[^\s<]+/g) || [];
  return Array.from(new Set(matches));
}
