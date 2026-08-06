export type DocSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  link?: string;
};

export type DocBlock =
  | { type: "paragraph"; spans: DocSpan[] }
  | { type: "heading"; level: number; spans: DocSpan[] }
  | { type: "image"; src: string };

export type GoogleDocContent = { title: string; blocks: DocBlock[] };

/** Extracts the document id from a Google Docs URL (or returns the raw id). */
export function extractGoogleDocId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1] ?? null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value;
  return null;
}

export function isGoogleDocUrl(input?: string | null): boolean {
  return !!input && /docs\.google\.com\/document\/d\//.test(input);
}
