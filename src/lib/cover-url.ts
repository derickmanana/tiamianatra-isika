import { supabase } from "@/integrations/supabase/client";
import { getFormationCover } from "@/lib/formation-covers";

const cache = new Map<string, { url: string; exp: number }>();

/** Resolve a formation cover URL. Supports http URLs, storage paths in `formation-covers`, or default. */
export async function resolveCoverUrl(formation: { title?: string | null; cover_url?: string | null }): Promise<string> {
  const raw = formation.cover_url?.trim();
  if (!raw) return getFormationCover(formation);
  if (/^https?:\/\//i.test(raw)) return raw;
  // storage path
  const now = Date.now();
  const hit = cache.get(raw);
  if (hit && hit.exp > now) return hit.url;
  const { data } = await supabase.storage.from("formation-covers").createSignedUrl(raw, 3600);
  if (data?.signedUrl) {
    cache.set(raw, { url: data.signedUrl, exp: now + 55 * 60 * 1000 });
    return data.signedUrl;
  }
  return getFormationCover(formation);
}
