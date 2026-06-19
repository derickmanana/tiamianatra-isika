import { youtubeEmbedUrl } from "@/lib/youtube";

export function YouTubeCover({ url, className }: { url: string; className?: string }) {
  const src = youtubeEmbedUrl(url, { autoplay: true, mute: true, loop: true, controls: false });
  if (!src) return null;
  return (
    <div className={"absolute inset-0 pointer-events-none " + (className ?? "")}>
      <iframe
        src={src}
        title="cover"
        allow="autoplay; encrypted-media; picture-in-picture"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] border-0"
      />
    </div>
  );
}
