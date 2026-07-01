import { memo, useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/cover-url";
import { getFormationCover } from "@/lib/formation-covers";
import { YouTubeCover } from "@/components/YouTubeCover";
import { extractYouTubeId } from "@/lib/youtube";
import fallback from "@/assets/formation-business.jpg";

type F = { title?: string | null; cover_url?: string | null; cover_type?: string | null; youtube_url?: string | null };

/** In-memory cache of URLs known to fail so we don't retry them. */
const brokenUrls = new Set<string>();

function isSafeImageUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  if (brokenUrls.has(u)) return false;
  // Only http(s) or storage-path-like strings
  return /^https?:\/\//i.test(u) || /^[a-zA-Z0-9_\-\/\.]+$/.test(u);
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
  const [src, setSrc] = useState<string>(isSafeImageUrl(initial) ? initial : fallback);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    setErrored(false);
    resolveCoverUrl(formation).then((u) => {
      if (!active) return;
      if (u && isSafeImageUrl(u)) setSrc(u);
      else setSrc(fallback);
    }).catch(() => { if (active) setSrc(fallback); });
    return () => { active = false; };
  }, [formation.cover_url, formation.title]);

  const isVideo = formation.cover_type === "video" && !!formation.youtube_url;

  const handleError = (url: string) => {
    if (url) brokenUrls.add(url);
    console.warn("[CoverImage] media error, using fallback:", url);
    setErrored(true);
  };

  if (isVideo && preferStatic) {
    const id = extractYouTubeId(formation.youtube_url!);
    const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : src;
    return (
      <img
        src={errored ? fallback : thumb}
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
        <img
          src={errored ? fallback : src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => handleError(src)}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <YouTubeCover url={formation.youtube_url!} />
      </div>
    );
  }

  return (
    <img
      src={errored ? fallback : src}
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
