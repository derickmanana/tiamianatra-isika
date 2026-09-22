import { useMemo } from "react";

export type LegalHeading = { id: string; text: string };

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function extractHeadings(content: string): LegalHeading[] {
  return content
    .split("\n")
    .filter((l) => l.startsWith("## ") && !l.startsWith("### "))
    .map((l) => {
      const text = l.replace(/^##\s+/, "").trim();
      return { id: slugifyHeading(text), text };
    });
}

function inline(text: string, keyPrefix: string) {
  // **gras** uniquement — pas de HTML brut injecté
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{p}</span>
    ),
  );
}

/** Rendu léger et sûr d'un contenu markdown simple (titres, listes, citations, gras). */
export function LegalMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => content.replace(/\r\n/g, "\n").split("\n"), [content]);

  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushList = (key: string) => {
    if (!list.length) return;
    const items = list.map((item, i) => (
      <li key={`${key}-li-${i}`} className="leading-relaxed">
        {inline(item, `${key}-li-${i}`)}
      </li>
    ));
    nodes.push(
      ordered ? (
        <ol key={key} className="list-decimal pl-5 space-y-1.5 my-3 text-muted-foreground">{items}</ol>
      ) : (
        <ul key={key} className="list-disc pl-5 space-y-1.5 my-3 text-muted-foreground">{items}</ul>
      ),
    );
    list = [];
    ordered = false;
  };

  blocks.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList(`list-${idx}`);
      return;
    }
    if (line.startsWith("### ")) {
      flushList(`list-${idx}`);
      const text = line.slice(4).trim();
      nodes.push(
        <h3 key={idx} id={slugifyHeading(text)} className="text-base font-semibold mt-5 mb-2 scroll-mt-24">
          {text}
        </h3>,
      );
      return;
    }
    if (line.startsWith("## ")) {
      flushList(`list-${idx}`);
      const text = line.slice(3).trim();
      nodes.push(
        <h2 key={idx} id={slugifyHeading(text)} className="text-lg md:text-xl font-bold mt-7 mb-2 scroll-mt-24 border-b pb-1.5">
          {text}
        </h2>,
      );
      return;
    }
    if (line.startsWith("> ")) {
      flushList(`list-${idx}`);
      nodes.push(
        <blockquote key={idx} className="border-l-4 border-primary/50 bg-muted/50 rounded-r-lg px-4 py-2.5 my-4 text-sm text-muted-foreground">
          {inline(line.slice(2), `q-${idx}`)}
        </blockquote>,
      );
      return;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (ordered) flushList(`list-${idx}`);
      list.push(bullet[1]);
      return;
    }
    const num = line.match(/^\d+\.\s+(.*)$/);
    if (num) {
      if (!ordered && list.length) flushList(`list-${idx}`);
      ordered = true;
      list.push(num[1]);
      return;
    }
    flushList(`list-${idx}`);
    nodes.push(
      <p key={idx} className="text-sm md:text-[15px] leading-relaxed text-muted-foreground my-2.5">
        {inline(line, `p-${idx}`)}
      </p>,
    );
  });
  flushList("list-end");

  return <div className="max-w-none">{nodes}</div>;
}
