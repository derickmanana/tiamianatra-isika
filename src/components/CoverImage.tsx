import { memo, useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/cover-url";
import { getFormationCover } from "@/lib/formation-covers";
import { YouTubeCover } from "@/components/YouTubeCover";
import { extractYouTubeId } from "@/lib/youtube";
import fallback from "@/assets/formation-business.jpg";

type F = { title?: string | null; cover_url?: string | null; cover_type?: string | null; youtube_url?: string | null };

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
  /** Force usage of a static thumbnail even when cover_type === "video". Recommended for grids. */
  preferStatic?: boolean;
}) {
  const [src, setSrc] = useState<string>(() => getFormationCover(formation));
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    setErrored(false);
    resolveCoverUrl(formation).then((u) => { if (active && u) setSrc(u); });
    return () => { active = false; };
  }, [formation.cover_url, formation.title]);

  const isVideo = formation.cover_type === "video" && !!formation.youtube_url;

  // Grid mode: use YouTube static thumbnail instead of mounting an iframe per card.
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
        onError={() => setErrored(true)}
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
          onError={() => setErrored(true)}
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
      onError={() => setErrored(true)}
      className={className}
    />
  );
}

export const CoverImage = memo(CoverImageImpl);
