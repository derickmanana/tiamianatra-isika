import webapp from "@/assets/formation-webapp.jpg";
import china from "@/assets/formation-china.jpg";
import canva from "@/assets/formation-canva.jpg";
import music from "@/assets/formation-music.jpg";
import crypto from "@/assets/formation-crypto.jpg";
import business from "@/assets/formation-business.jpg";

// Map formation title keywords -> default cover image
const DEFAULTS: Array<{ match: RegExp; src: string }> = [
  { match: /application web|web app|cr[eé]ation/i, src: webapp },
  { match: /chine|china|fanafarana|import/i, src: china },
  { match: /canva/i, src: canva },
  { match: /music|musique|instrumental/i, src: music },
  { match: /crypto/i, src: crypto },
  { match: /gagner|business|application/i, src: business },
];

export function getFormationCover(formation: { title?: string | null; cover_url?: string | null }): string {
  if (formation.cover_url && formation.cover_url.trim()) return formation.cover_url;
  const t = formation.title ?? "";
  const m = DEFAULTS.find((d) => d.match.test(t));
  return m?.src ?? business;
}
