import { useQuery } from "@tanstack/react-query";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { getGoogleDoc } from "@/lib/google-docs.functions";
import type { DocSpan } from "@/lib/google-docs";

function Spans({ spans }: { spans: DocSpan[] }) {
  return (
    <>
      {spans.map((s, i) => {
        const content = (
          <span
            key={i}
            className={[
              s.bold ? "font-semibold" : "",
              s.italic ? "italic" : "",
              s.underline ? "underline" : "",
              s.strike ? "line-through" : "",
            ].join(" ")}
          >
            {s.text}
          </span>
        );
        return s.link ? (
          <a key={i} href={s.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {content}
          </a>
        ) : (
          content
        );
      })}
    </>
  );
}

export function GoogleDocViewer({ url }: { url: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["google-doc", url],
    queryFn: () => getGoogleDoc({ data: { url } }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du document Google Docs…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Impossible d'afficher ce document."}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans Google Docs
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-primary" />
        {data.title}
      </div>
      <div className="max-h-[65vh] overflow-y-auto rounded-md border bg-card p-4 space-y-3">
        {data.blocks.map((b, i) => {
          if (b.type === "image") {
            return <img key={i} src={b.src} alt="" loading="lazy" className="max-w-full rounded-md" />;
          }
          if (b.type === "heading") {
            const size =
              b.level <= 1 ? "text-xl" : b.level === 2 ? "text-lg" : "text-base";
            return (
              <p key={i} className={`${size} font-semibold`}>
                <Spans spans={b.spans} />
              </p>
            );
          }
          return (
            <p key={i} className="text-sm leading-relaxed text-foreground/90">
              <Spans spans={b.spans} />
            </p>
          );
        })}
        {data.blocks.length === 0 && (
          <p className="text-sm text-muted-foreground">Ce document est vide.</p>
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans Google Docs
      </a>
    </div>
  );
}
