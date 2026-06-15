// YouTube helpers
export function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("list");
    return id;
  } catch {
    // Maybe a raw id
    if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
    return null;
  }
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
