import { createServerFn } from "@tanstack/react-start";
import { extractGoogleDocId, type DocBlock, type DocSpan, type GoogleDocContent } from "./google-docs";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_docs/v1";

function headingLevel(named?: string): number | null {
  const m = /^HEADING_(\d)$/.exec(named ?? "");
  return m ? Number(m[1]) : null;
}

function toSpans(elements: any[], doc: any): DocSpan[] {
  const spans: DocSpan[] = [];
  for (const el of elements ?? []) {
    if (el.textRun) {
      const raw = String(el.textRun.content ?? "").replace(/\n+$/, "");
      if (!raw) continue;
      const s = el.textRun.textStyle ?? {};
      spans.push({
        text: raw,
        bold: !!s.bold,
        italic: !!s.italic,
        underline: !!s.underline,
        strike: !!s.strikethrough,
        link: s.link?.url,
      });
    } else if (el.inlineObjectElement) {
      const obj = doc.inlineObjects?.[el.inlineObjectElement.inlineObjectId];
      const uri =
        obj?.inlineObjectProperties?.embeddedObject?.imageProperties?.contentUri ??
        obj?.inlineObjectProperties?.embeddedObject?.imageProperties?.sourceUri;
      if (uri) spans.push({ text: `\u0000image:${uri}` });
    }
  }
  return spans;
}

function toBlocks(doc: any): DocBlock[] {
  const blocks: DocBlock[] = [];
  for (const item of doc.body?.content ?? []) {
    const p = item.paragraph;
    if (!p) continue;
    const spans = toSpans(p.elements, doc);
    for (const s of spans.filter((x) => x.text.startsWith("\u0000image:"))) {
      blocks.push({ type: "image", src: s.text.slice("\u0000image:".length) });
    }
    const textSpans = spans.filter((x) => !x.text.startsWith("\u0000image:"));
    if (textSpans.length === 0) continue;
    const level = headingLevel(p.paragraphStyle?.namedStyleType);
    blocks.push(level ? { type: "heading", level, spans: textSpans } : { type: "paragraph", spans: textSpans });
  }
  return blocks;
}

export const getGoogleDoc = createServerFn({ method: "GET" })
  .inputValidator((data: { url: string }) => {
    const id = extractGoogleDocId(data.url);
    if (!id) throw new Error("Lien Google Docs invalide.");
    return { documentId: id };
  })
  .handler(async ({ data }): Promise<GoogleDocContent> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["GOOGLE_DOCS_API_KEY"];
    if (!lovableKey || !connectionKey) throw new Error("Google Docs n'est pas connecté.");

    const res = await fetch(`${GATEWAY_URL}/documents/${data.documentId}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Docs gateway failed [${res.status}]: ${body}`);
      throw new Error(
        res.status === 403 || res.status === 404
          ? "Document introuvable ou non accessible par le compte Google connecté."
          : "Impossible de charger ce document Google Docs.",
      );
    }
    const doc = await res.json();
    return { title: String(doc.title ?? "Document"), blocks: toBlocks(doc) };
  });
