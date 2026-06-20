import { useEffect, useRef, useState } from "react";
import { youtubeEmbedUrl, extractYouTubeId } from "@/lib/youtube";

/**
 * Renders a YouTube cover as a static thumbnail first, then upgrades to the
 * actual iframe only when in viewport. Avoids loading many iframes at once.
 */
export function YouTubeCover({ url, className }: { url: string; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const id = extractYouTubeId(url);
  const src = youtubeEmbedUrl(url, { autoplay: true, mute: true, loop: true, controls: false });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!src || !id) return null;
  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div ref={ref} className={"absolute inset-0 pointer-events-none overflow-hidden " + (className ?? "")}>
      <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
      {visible && (
        <iframe
          src={src}
          title="cover"
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] border-0"
        />
      )}
    </div>
  );
}
