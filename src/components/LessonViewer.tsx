import { useEffect, useState } from "react";
import { FileText, ExternalLink, Download, File as FileIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleDocViewer } from "@/components/GoogleDocViewer";
import { isGoogleDocUrl } from "@/lib/google-docs";


export type LessonFile = { name: string; path: string; mime?: string };

export type Lesson = {
  id: string;
  title: string;
  description?: string | null;
  external_url?: string | null;
  files?: LessonFile[] | null;
};

function isPdf(f: LessonFile) {
  return f.mime === "application/pdf" || /\.pdf$/i.test(f.name);
}

export function LessonViewer({
  lesson,
  open,
  onOpenChange,
}: {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [active, setActive] = useState<LessonFile | null>(null);
  const files = (lesson?.files ?? []) as LessonFile[];

  useEffect(() => {
    setActive(null);
    setUrls({});
    if (!open || !lesson || files.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const f of files) {
        const { data } = await supabase.storage.from("lesson-files").createSignedUrl(f.path, 3600);
        if (data?.signedUrl) entries[f.path] = data.signedUrl;
      }
      if (!cancelled) {
        setUrls(entries);
        const firstPdf = files.find(isPdf);
        if (firstPdf) setActive(firstPdf);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lesson?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {lesson?.title}
          </DialogTitle>
        </DialogHeader>

        {lesson?.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.description}</p>
        )}

        {lesson?.external_url && isGoogleDocUrl(lesson.external_url) && (
          <GoogleDocViewer url={lesson.external_url} />
        )}

        {lesson?.external_url && !isGoogleDocUrl(lesson.external_url) && (
          <a
            href={lesson.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Ouvrir le lien externe
          </a>
        )}


        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {files.map((f) => (
                <Button
                  key={f.path}
                  size="sm"
                  variant={active?.path === f.path ? "default" : "outline"}
                  onClick={() => (isPdf(f) ? setActive(f) : window.open(urls[f.path], "_blank"))}
                >
                  {isPdf(f) ? <FileText className="h-3.5 w-3.5 mr-1" /> : <FileIcon className="h-3.5 w-3.5 mr-1" />}
                  <span className="max-w-[180px] truncate">{f.name}</span>
                </Button>
              ))}
            </div>

            {active && urls[active.path] && (
              <div className="space-y-2">
                <iframe
                  src={urls[active.path]}
                  title={active.name}
                  className="w-full h-[65vh] rounded-md border bg-muted"
                />
                <a
                  href={urls[active.path]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger {active.name}
                </a>
              </div>
            )}
          </div>
        )}

        {!lesson?.description && !lesson?.external_url && files.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun contenu pour cette leçon.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
