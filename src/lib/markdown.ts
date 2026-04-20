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

export type MarkdownEditorState = {
  source: string;
  ast: unknown;
  activeLine: number;
  renderMode: MarkdownRenderMode;
};

export function parseMarkdownAst(source: string) {
  return parseProcessor.parse(source);
}

export function renderMarkdownToHtml(source: string) {
  return String(renderProcessor.processSync(source));
}

export function extractMarkdownUrls(input: string) {
  const matches = input.match(/https?:\/\/[^\s<]+/g) || [];
  return Array.from(new Set(matches));
}
