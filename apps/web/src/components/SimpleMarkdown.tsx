"use client";

import type { ReactNode } from "react";

/**
 * Lightweight Markdown → React for human reading (headings, lists, bold/italic, paragraphs).
 * Not a full CommonMark parser — enough for Report AI output.
 */

function inline(text: string): ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0]!;
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={key++} className="rounded bg-mist px-1 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key++}
            href={link[2]}
            className="text-accent underline decoration-line underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            {link[1]}
          </a>
        );
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "hr" };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h2", text: trimmed.slice(2) });
      i += 1;
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? "").trim();
        if (!/^[-*•]\s+/.test(t)) break;
        items.push(t.replace(/^[-*•]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length) {
        const t = (lines[i] ?? "").trim();
        if (!/^\d+[.)]\s+/.test(t)) break;
        items.push(t.replace(/^\d+[.)]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const t = (lines[i] ?? "").trim();
      if (!t || t.startsWith("#") || /^[-*•]\s+/.test(t) || /^\d+[.)]\s+/.test(t) || /^---+$/.test(t)) break;
      para.push(t);
      i += 1;
    }
    blocks.push({ type: "p", text: para.join(" ") });
  }
  return blocks;
}

export function SimpleMarkdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="report-prose space-y-3 text-[15px] leading-relaxed text-ink/85">
      {blocks.map((b, idx) => {
        if (b.type === "hr") return <hr key={idx} className="border-line/70" />;
        if (b.type === "h2") {
          return (
            <h2 key={idx} className="font-display text-xl text-ink">
              {inline(b.text)}
            </h2>
          );
        }
        if (b.type === "h3") {
          return (
            <h3 key={idx} className="font-display text-lg text-ink">
              {inline(b.text)}
            </h3>
          );
        }
        if (b.type === "p") {
          return (
            <p key={idx} className="text-ink/80">
              {inline(b.text)}
            </p>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc space-y-1.5 pl-5">
              {b.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={idx} className="list-decimal space-y-2 pl-5">
              {b.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ol>
          );
        }
        return null;
      })}
    </div>
  );
}
