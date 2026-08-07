import { extractGoogleDocId, isGoogleDocUrl } from "@/lib/google-docs";
import { extractGoogleDriveId, isGoogleDriveUrl } from "@/lib/google-drive";
import { extractYouTubeId } from "@/lib/youtube";

export type LessonContentKind = "youtube" | "gdoc" | "gdrive" | "storage" | "none";

export type LessonContent =
  | { kind: "youtube"; videoId: string }
  | { kind: "gdoc"; embedUrl: string }
  | { kind: "gdrive"; embedUrl: string }
  | { kind: "storage"; path: string; name: string }
  | { kind: "none" };

export type LessonFileRef = { name: string; path: string; mime?: string };

export type LessonLike = {
  id: string;
  title: string;
  description?: string | null;
  external_url?: string | null;
  files?: LessonFileRef[] | null;
  display_order?: number;
};

function isYouTubeUrl(url: string) {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

/** Detects the embedded player to use for a lesson, from admin-provided links. */
export function detectLessonContent(lesson: LessonLike | null | undefined): LessonContent {
  if (!lesson) return { kind: "none" };
  const url = lesson.external_url?.trim();
  if (url) {
    if (isYouTubeUrl(url)) {
      const id = extractYouTubeId(url);
      if (id) return { kind: "youtube", videoId: id };
    }
    if (isGoogleDocUrl(url)) {
      const id = extractGoogleDocId(url);
      if (id) return { kind: "gdoc", embedUrl: `https://docs.google.com/document/d/${id}/preview` };
    }
    if (isGoogleDriveUrl(url)) {
      const id = extractGoogleDriveId(url);
      if (id) return { kind: "gdrive", embedUrl: `https://drive.google.com/file/d/${id}/preview` };
    }
  }
  const file = (lesson.files ?? [])[0];
  if (file) return { kind: "storage", path: file.path, name: file.name };
  return { kind: "none" };
}

/** Icon key for the lesson type, used by the UI. */
export function lessonKind(lesson: LessonLike): LessonContentKind {
  return detectLessonContent(lesson).kind;
}
