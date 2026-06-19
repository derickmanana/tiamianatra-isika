import { useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/cover-url";
import { getFormationCover } from "@/lib/formation-covers";
import { YouTubeCover } from "@/components/YouTubeCover";

type F = { title?: string | null; cover_url?: string | null; cover_type?: string | null; youtube_url?: string | null };

export function CoverImage({ formation, alt, className, videoOnHover }: { formation: F; alt: string; className?: string; videoOnHover?: boolean }) {
  const [src, setSrc] = useState<string>(() => getFormationCover(formation));
  useEffect(() => {
    let active = true;
    resolveCoverUrl(formation).then((u) => { if (active) setSrc(u); });
    return () => { active = false; };
  }, [formation.cover_url, formation.title]);

  const isVideo = formation.cover_type === "video" && !!formation.youtube_url;

  if (isVideo && !videoOnHover) {
    return (
      <div className={"relative w-full h-full overflow-hidden bg-black " + (className ?? "")}>
        <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <YouTubeCover url={formation.youtube_url!} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" width={1280} height={720} className={className} />;
}
