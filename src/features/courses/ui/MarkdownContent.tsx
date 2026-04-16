"use client";

import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-xl font-bold text-black first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-lg font-semibold text-black first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-black first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-6 text-[var(--muted)] last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-black">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[var(--muted)]">{children}</em>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1 pl-5 text-sm text-[var(--muted)] [list-style:disc]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 space-y-1 pl-5 text-sm text-[var(--muted)] [list-style:decimal]">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-6">{children}</li>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block">{children}</code>
      );
    }
    return (
      <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-black">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-xl bg-black/5 px-4 py-3 font-mono text-xs leading-6 text-black">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-[var(--accent)] pl-4 text-sm italic text-[var(--muted)]">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-black/10">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="bg-black/5 px-3 py-2 text-left text-xs font-semibold text-black">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-xs text-[var(--muted)]">{children}</td>
  ),
  hr: () => <hr className="my-4 border-black/10" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--accent-strong)] underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <span className="my-4 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        className="max-w-full rounded-2xl border border-black/10"
      />
      {alt ? (
        <span className="mt-1 block text-xs text-[var(--muted)]">{alt}</span>
      ) : null}
    </span>
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="mt-3">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
