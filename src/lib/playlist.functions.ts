import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseISO8601Duration } from "@/lib/youtube";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

function extractPlaylistId(input: string): string | null {
  const raw = input.trim();
  // Already an ID?
  if (/^(PL|UU|FL|LL|RD|OL)[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    const list = u.searchParams.get("list");
    if (list) return list;
  } catch {}
  // Try to find list= in arbitrary string
  const m = raw.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

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

async function getYoutubeApiKey(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("api_settings").select("value").eq("key", "youtube_api_key").maybeSingle();
  const dbKey = (data?.value ?? "").trim();
  if (dbKey) return dbKey;
  const envKey = (process.env.YOUTUBE_API_KEY ?? "").trim();
  return envKey || null;
}

export const saveYoutubeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => z.object({ key: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_settings").upsert({ key: "youtube_api_key", value: data.key.trim(), updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const getYoutubeApiKeyMasked = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("api_settings").select("value").eq("key", "youtube_api_key").maybeSingle();
    const v = data?.value ?? "";
    return { hasKey: v.length > 0, masked: v ? `${v.slice(0, 4)}…${v.slice(-4)}` : "" };
  });

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

    const apiKey = await getYoutubeApiKey();
    if (!apiKey) throw new Error("Clé YouTube API absente. Configurez-la dans l'onglet Paramètres API.");

    const playlistId = extractPlaylistId(data.playlistUrl);
    if (!playlistId) throw new Error("URL de playlist YouTube invalide.");

    const items = await fetchAllPlaylistItems(playlistId, apiKey);
    if (items.length === 0) throw new Error("Aucune vidéo trouvée dans la playlist.");
    const durations = await fetchDurations(items.map((i) => i.videoId), apiKey);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin.from("playlists").select("id").eq("module_id", data.moduleId).maybeSingle();
    let playlistRowId: string;
    if (existing) {
      await supabaseAdmin.from("playlists").update({
        youtube_playlist_id: playlistId,
        youtube_url: data.playlistUrl,
        last_synced_at: new Date().toISOString(),
      }).eq("id", existing.id);
      playlistRowId = existing.id;
    } else {
      const { data: ins } = await supabaseAdmin.from("playlists").insert({
        module_id: data.moduleId,
        youtube_playlist_id: playlistId,
        youtube_url: data.playlistUrl,
        last_synced_at: new Date().toISOString(),
      }).select("id").single();
      playlistRowId = ins!.id;
    }

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
