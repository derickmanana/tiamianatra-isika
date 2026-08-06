export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: number | null;
  /** Inline data URL when the file is small enough to embed. */
  dataUrl?: string | null;
  webViewLink?: string | null;
};

/** Extracts a Drive file/folder id from a Google Drive URL (or returns the raw id). */
export function extractGoogleDriveId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const byPath = value.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath) return byPath[1] ?? null;
  const byOpen = value.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/);
  if (byOpen) return byOpen[1] ?? null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value)) return value;
  return null;
}

export function isGoogleDriveUrl(input?: string | null): boolean {
  if (!input) return false;
  if (/drive\.google\.com\/drive\/folders\//.test(input)) return false;
  return /drive\.google\.com\/(file\/d\/|open\?|uc\?)/.test(input);
}
