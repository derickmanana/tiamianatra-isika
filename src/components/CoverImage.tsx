import { memo, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { resolveCoverUrl } from "@/lib/cover-url";
import { getFormationCover } from "@/lib/formation-covers";
import { YouTubeCover } from "@/components/YouTubeCover";
import { extractYouTubeId } from "@/lib/youtube";

type F = { title?: string | null; cover_url?: string | null; cover_type?: string | null; youtube_url?: string | null };

const brokenUrls = new Set<string>();

function isSafeImageUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  if (brokenUrls.has(u)) return false;
  return /^https?:\/\//i.test(u) || /^[a-zA-Z0-9_\-\/\.]+$/.test(u);
}

function Placeholder({ className }: { className?: string }) {
  return (
    <div className={"absolute inset-0 grid place-items-center bg-gradient-to-br from-muted to-muted/60 " + (className ?? "")}>
      <GraduationCap className="h-10 w-10 text-muted-foreground/60" />
    </div>
  );
}

function CoverImageImpl({
  formation,
  alt,
  className,
  videoOnHover,
  preferStatic,
}: {
  formation: F;
  alt: string;
  className?: string;
  videoOnHover?: boolean;
  preferStatic?: boolean;
}) {
  const initial = getFormationCover(formation);
  const [src, setSrc] = useState<string>(isSafeImageUrl(initial) ? initial : "");
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    setErrored(false);
    resolveCoverUrl(formation).then((u) => {
      if (!active) return;
      setSrc(u && isSafeImageUrl(u) ? u : "");
    }).catch(() => { if (active) setSrc(""); });
    return () => { active = false; };
  }, [formation.cover_url, formation.title]);

  const isVideo = formation.cover_type === "video" && !!formation.youtube_url;

  const handleError = (url: string) => {
    if (url) brokenUrls.add(url);
    setErrored(true);
  };

  if (isVideo && preferStatic) {
    const id = extractYouTubeId(formation.youtube_url!);
    const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
    if (errored || !thumb) return <Placeholder className={className} />;
    return (
      <img
        src={thumb}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={1280}
        height={720}
        onError={() => handleError(thumb)}
        className={className}
      />
    );
  }

  if (isVideo && !videoOnHover) {
    return (
      <div className={"relative w-full h-full overflow-hidden bg-black " + (className ?? "")}>
        {src && !errored ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => handleError(src)}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        ) : null}
        <YouTubeCover url={formation.youtube_url!} />
      </div>
    );
  }

  if (!src || errored) return <Placeholder className={className} />;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={1280}
      height={720}
      onError={() => handleError(src)}
      className={className}
    />
  );
}

export const CoverImage = memo(CoverImageImpl);
