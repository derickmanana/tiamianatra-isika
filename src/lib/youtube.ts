// YouTube helpers
export function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("list");
    return id;
  } catch {
    if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
    return null;
  }
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/(embed|shorts|v)\/([A-Za-z0-9_-]{6,})/);
    if (m) return m[2];
    return null;
  } catch {
    if (/^[A-Za-z0-9_-]{6,15}$/.test(url)) return url;
    return null;
  }
}

export function youtubeEmbedUrl(url: string, opts: { autoplay?: boolean; mute?: boolean; loop?: boolean; controls?: boolean } = {}): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams();
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.mute) params.set("mute", "1");
  if (opts.loop) { params.set("loop", "1"); params.set("playlist", id); }
  params.set("controls", opts.controls === false ? "0" : "1");
  params.set("modestbranding", "1");
  params.set("rel", "0");
  params.set("playsinline", "1");
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function parseISO8601Duration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, h, mm, s] = m;
  return (Number(h) || 0) * 3600 + (Number(mm) || 0) * 60 + (Number(s) || 0);
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
