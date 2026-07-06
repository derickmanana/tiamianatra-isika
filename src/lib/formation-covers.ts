/**
 * Returns a validated cover URL for a formation, or an empty string when none
 * has been provided. Callers should render a neutral placeholder in that case.
 * No auto-generation, no title-based guessing, no default asset.
 */
export function getFormationCover(formation: { title?: string | null; cover_url?: string | null }): string {
  const raw = formation?.cover_url?.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-zA-Z0-9_\-\/\.]+$/.test(raw)) return raw;
  return "";
}
