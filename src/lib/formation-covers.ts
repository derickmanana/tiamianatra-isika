import defaultCover from "@/assets/formation-business.jpg";

/**
 * Returns a validated cover URL for a formation.
 * - If `cover_url` is a valid http(s) URL or a storage path, returns it.
 * - Otherwise returns a single neutral default image.
 * No auto-generation, no title-based guessing.
 */
export function getFormationCover(formation: { title?: string | null; cover_url?: string | null }): string {
  const raw = formation?.cover_url?.trim();
  if (!raw) return defaultCover;
  // Accept http(s) URLs
  if (/^https?:\/\//i.test(raw)) return raw;
  // Accept storage paths (resolved elsewhere via signed URL)
  if (/^[a-zA-Z0-9_\-\/\.]+$/.test(raw)) return raw;
  return defaultCover;
}

export { defaultCover };
