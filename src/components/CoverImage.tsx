import { useEffect, useState } from "react";
import { resolveCoverUrl } from "@/lib/cover-url";
import { getFormationCover } from "@/lib/formation-covers";

export function CoverImage({ formation, alt, className }: { formation: { title?: string | null; cover_url?: string | null }; alt: string; className?: string }) {
  const [src, setSrc] = useState<string>(() => getFormationCover(formation));
  useEffect(() => {
    let active = true;
    resolveCoverUrl(formation).then((u) => { if (active) setSrc(u); });
    return () => { active = false; };
  }, [formation.cover_url, formation.title]);
  return <img src={src} alt={alt} loading="lazy" width={1280} height={720} className={className} />;
}
