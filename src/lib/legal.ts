export const LEGAL_SLUGS = [
  "cgu",
  "cgv",
  "confidentialite",
  "cookies",
  "mentions-legales",
  "remboursement",
  "regles-utilisation",
  "contenus-droits-auteur",
  "contact-donnees",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

/** Clés de configuration (table `settings`) utilisées dans les documents. */
export const LEGAL_SETTING_KEYS = [
  { key: "legal_company_name", token: "company_name", label: "Nom / dénomination de l'éditeur" },
  { key: "legal_status", token: "legal_status", label: "Statut juridique" },
  { key: "legal_address", token: "address", label: "Adresse professionnelle" },
  { key: "legal_contact_email", token: "contact_email", label: "Email de contact" },
  { key: "legal_phone", token: "phone", label: "Téléphone" },
  { key: "legal_registration", token: "registration", label: "Informations d'enregistrement (NIF, STAT, RCS…)" },
  { key: "legal_publisher", token: "publisher", label: "Responsable de la publication" },
  { key: "legal_host", token: "host", label: "Informations d'hébergement" },
] as const;

export const MISSING_VALUE = "[À compléter par l'administrateur]";

/** Remplace les {{tokens}} du document par les valeurs configurées. */
export function fillLegalTokens(content: string, settings: Record<string, string | null | undefined>) {
  return content.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, token: string) => {
    const entry = LEGAL_SETTING_KEYS.find((e) => e.token === token.toLowerCase());
    const value = entry ? settings[entry.key] : undefined;
    return value && value.trim() ? value.trim() : MISSING_VALUE;
  });
}

export type CookiePrefs = { necessary: true; preferences: boolean; analytics: boolean };

export const COOKIE_STORAGE_KEY = "mbt_cookie_consent_v1";
export const COOKIE_POLICY_VERSION = "1.0";

export function readCookiePrefs(): (CookiePrefs & { decided_at: string; version: string }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      necessary: true,
      preferences: !!parsed.preferences,
      analytics: !!parsed.analytics,
      decided_at: String(parsed.decided_at ?? ""),
      version: String(parsed.version ?? COOKIE_POLICY_VERSION),
    };
  } catch {
    return null;
  }
}

export function writeCookiePrefs(prefs: Omit<CookiePrefs, "necessary">) {
  if (typeof window === "undefined") return;
  const payload = {
    necessary: true,
    preferences: prefs.preferences,
    analytics: prefs.analytics,
    version: COOKIE_POLICY_VERSION,
    decided_at: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("mbt-cookie-consent"));
  return payload;
}
