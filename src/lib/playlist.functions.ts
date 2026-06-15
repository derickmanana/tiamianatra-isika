import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseISO8601Duration } from "@/lib/youtube";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function fetchAllPlaylistItems(playlistId: string, apiKey: string) {
  const items: Array<{ videoId: string; title: string; thumb: string; position: number }> = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      maxResults: "50",
      playlistId,
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${YT_BASE}/playlistItems?${params}`);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    for (const it of data.items ?? []) {
      const snip = it.snippet ?? {};
      const vid = it.contentDetails?.videoId ?? snip.resourceId?.videoId;
      if (!vid) continue;
      items.push({
        videoId: vid,
        title: snip.title ?? "Untitled",
        thumb: snip.thumbnails?.high?.url ?? snip.thumbnails?.default?.url ?? "",
        position: snip.position ?? items.length,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

async function fetchDurations(videoIds: string[], apiKey: string) {
  const map = new Map<string, number>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: "contentDetails",
      id: chunk.join(","),
      key: apiKey,
    });
    const res = await fetch(`${YT_BASE}/videos?${params}`);
    if (!res.ok) continue;
    const data = await res.json();
    for (const v of data.items ?? []) {
      map.set(v.id, parseISO8601Duration(v.contentDetails?.duration ?? ""));
    }
  }
  return map;
}

export const syncPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { moduleId: string; playlistUrl: string }) =>
    z.object({ moduleId: z.string().uuid(), playlistUrl: z.string().min(5) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

    // Extract playlist id
    let playlistId: string | null = null;
    try {
      const u = new URL(data.playlistUrl);
      playlistId = u.searchParams.get("list");
    } catch {
      playlistId = data.playlistUrl;
    }
    if (!playlistId) throw new Error("Invalid playlist URL");

    const items = await fetchAllPlaylistItems(playlistId, apiKey);
    const durations = await fetchDurations(items.map((i) => i.videoId), apiKey);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Upsert playlist row
    const { data: pl, error: plErr } = await supabaseAdmin
      .from("playlists")
      .upsert(
        { module_id: data.moduleId, youtube_playlist_id: playlistId, youtube_url: data.playlistUrl, last_synced_at: new Date().toISOString() },
        { onConflict: "module_id" as never },
      )
      .select()
      .single();
    if (plErr) {
      // Fall back to insert/update manually
      const { data: existing } = await supabaseAdmin.from("playlists").select("id").eq("module_id", data.moduleId).maybeSingle();
      if (existing) {
        await supabaseAdmin.from("playlists").update({ youtube_playlist_id: playlistId, youtube_url: data.playlistUrl, last_synced_at: new Date().toISOString() }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("playlists").insert({ module_id: data.moduleId, youtube_playlist_id: playlistId, youtube_url: data.playlistUrl, last_synced_at: new Date().toISOString() });
      }
    }
    const { data: plRow } = await supabaseAdmin.from("playlists").select("id").eq("module_id", data.moduleId).maybeSingle();
    const playlistRowId = pl?.id ?? plRow?.id;

    // Clear previous videos for module then insert
    await supabaseAdmin.from("videos").delete().eq("module_id", data.moduleId);
    const rows = items.map((it) => ({
      module_id: data.moduleId,
      playlist_id: playlistRowId,
      youtube_video_id: it.videoId,
      title: it.title,
      thumbnail_url: it.thumb,
      duration_seconds: durations.get(it.videoId) ?? 0,
      position: it.position,
    }));
    if (rows.length) await supabaseAdmin.from("videos").insert(rows);

    return { count: rows.length };
  });
