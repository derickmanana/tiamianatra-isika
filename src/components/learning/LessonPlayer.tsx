import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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

function YouTubeLesson({ videoId, onEnded }: { videoId: string; onEnded: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    endedRef.current = false;
    let player: any;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !ref.current) return;
      player = new YT.Player(ref.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.ENDED && !endedRef.current) {
              endedRef.current = true;
              onEnded();
            }
          },
        },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={ref} className="h-full w-full" />
    </div>
  );
}

function StorageLesson({ path, name }: { path: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("lesson-files").createSignedUrl(path, 3600);
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url)
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  return <iframe src={url} title={name} className="h-[70vh] w-full rounded-xl border bg-muted" />;
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
    <div className="space-y-3 rounded-2xl border bg-card p-3 sm:p-4">
      {lesson.description && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lesson.description}</p>
      )}

      {content.kind === "youtube" && (
        <YouTubeLesson videoId={content.videoId} onEnded={onComplete} />
      )}

      {(content.kind === "gdoc" || content.kind === "gdrive") && (
        <iframe
          src={content.embedUrl}
          title={lesson.title}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="h-[70vh] w-full rounded-xl border bg-muted"
        />
      )}

      {content.kind === "storage" && <StorageLesson path={content.path} name={content.name} />}

      {content.kind === "none" && (
        <p className="rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground">
          Contenu bientôt disponible.
        </p>
      )}

      {content.kind !== "none" && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            {content.kind === "youtube"
              ? "La leçon est validée automatiquement à la fin de la vidéo."
              : "Consultez le document puis validez la leçon."}
          </p>
          <Button size="sm" onClick={onComplete} disabled={completed || saving} className="gap-2">
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
