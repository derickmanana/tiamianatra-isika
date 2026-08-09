import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { detectLessonContent, type LessonLike } from "@/lib/lesson-content";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytApiPromise;
}

function YouTubeLesson({ videoId }: { videoId: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: any;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !ref.current) return;
      player = new YT.Player(ref.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      });
    });
    return () => {
      cancelled = true;
      try {
        player?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

function Unavailable({ url, message }: { url?: string; message?: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="flex items-start gap-2 text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {message ??
          "Impossible d'afficher ce contenu. Le fichier Google Drive n'est pas accessible avec les autorisations actuelles."}
      </p>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ouvrir le contenu dans un nouvel onglet
        </a>
      )}
    </div>
  );
}

/** PDF: opens in the phone's external viewer/Chrome. Other files render inline (blob URL). */
function StorageLesson({ path, name, isPdf }: { path: string; name: string; isPdf: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setFailed(false);
    (async () => {
      if (isPdf) {
        const { data, error } = await supabase.storage
          .from("lesson-files")
          .createSignedUrl(path, 60 * 60);
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setFailed(true);
          return;
        }
        setUrl(data.signedUrl);
        return;
      }
      const { data, error } = await supabase.storage.from("lesson-files").download(path);
      if (cancelled) return;
      if (error || !data) {
        setFailed(true);
        return;
      }
      objectUrl = URL.createObjectURL(new Blob([data], { type: data.type || "application/octet-stream" }));
      setUrl(objectUrl);
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, isPdf]);

  if (failed)
    return <Unavailable message="Impossible d'afficher ce document. Veuillez contacter le formateur." />;

  if (!url)
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  if (isPdf)
    return (
      <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
        <p className="text-muted-foreground">
          Ce document PDF s'ouvre dans le lecteur PDF de votre téléphone ou dans Chrome.
        </p>
        <Button asChild size="lg" className="gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" /> Ouvrir le PDF
          </a>
        </Button>
      </div>
    );

  return (
    <iframe
      src={url}
      title={name}
      className="h-[70vh] max-h-[70vh] w-full rounded-xl border bg-muted"
    />
  );
}


export function LessonPlayer({
  lesson,
  completed,
  saving,
  onComplete,
}: {
  lesson: LessonLike;
  completed: boolean;
  saving?: boolean;
  onComplete: () => void;
}) {
  const content = detectLessonContent(lesson);

  return (
    <div className="space-y-3">
      {content.kind === "youtube" && <YouTubeLesson videoId={content.videoId} />}

      {(content.kind === "gdoc" || content.kind === "gdrive") && (
        <div className="w-full overflow-hidden rounded-xl border bg-muted">
          <iframe
            src={content.embedUrl}
            title={lesson.title}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="h-[70vh] max-h-[70vh] w-full"
          />
        </div>
      )}

      {content.kind === "storage" && (
        <StorageLesson path={content.path} name={content.name} isPdf={content.isPdf} />
      )}

      {content.kind === "link" && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="text-muted-foreground">
            Ce contenu ne peut pas être affiché directement dans l'application.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={content.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Ouvrir le contenu
            </a>
          </Button>
        </div>
      )}

      {content.kind === "none" && (
        <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
          Contenu bientôt disponible.
        </p>
      )}

      {lesson.description && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lesson.description}</p>
      )}

      {content.kind !== "none" && (
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Consultez le contenu puis validez la leçon pour enregistrer votre progression.
          </p>
          <Button size="lg" onClick={onComplete} disabled={completed || saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {completed ? "Terminé" : "Marquer comme terminé"}
          </Button>
        </div>
      )}
    </div>
  );
}
