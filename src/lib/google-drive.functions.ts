import { createServerFn } from "@tanstack/react-start";
import { extractGoogleDriveId, type DriveFile } from "./google-drive";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Google Drive n'est pas connecté.");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
  };
}

function friendlyError(status: number) {
  return status === 403 || status === 404
    ? "Fichier introuvable ou non accessible par le compte Google connecté."
    : "Impossible de charger ce fichier Google Drive.";
}

export const getGoogleDriveFile = createServerFn({ method: "GET" })
  .inputValidator((data: { url: string }) => {
    const id = extractGoogleDriveId(data.url);
    if (!id) throw new Error("Lien Google Drive invalide.");
    return { fileId: id };
  })
  .handler(async ({ data }): Promise<DriveFile> => {
    const headers = gatewayHeaders();

    const metaRes = await fetch(
      `${GATEWAY_URL}/files/${data.fileId}?fields=id,name,mimeType,size,webViewLink&supportsAllDrives=true`,
      { headers },
    );
    if (!metaRes.ok) {
      console.error(`Google Drive gateway failed [${metaRes.status}]: ${await metaRes.text()}`);
      throw new Error(friendlyError(metaRes.status));
    }
    const meta = await metaRes.json();
    const mimeType = String(meta.mimeType ?? "application/octet-stream");
    const size = meta.size ? Number(meta.size) : null;

    const file: DriveFile = {
      id: String(meta.id),
      name: String(meta.name ?? "Fichier"),
      mimeType,
      size,
      webViewLink: meta.webViewLink ?? null,
      dataUrl: null,
    };

    const isGoogleNative = mimeType.startsWith("application/vnd.google-apps");
    const embeddable =
      mimeType === "application/pdf" || mimeType.startsWith("image/") || mimeType.startsWith("text/");
    if (isGoogleNative || !embeddable || (size !== null && size > MAX_INLINE_BYTES)) return file;

    const contentRes = await fetch(
      `${GATEWAY_URL}/files/${data.fileId}?alt=media&supportsAllDrives=true`,
      { headers },
    );
    if (!contentRes.ok) {
      console.error(`Google Drive download failed [${contentRes.status}]: ${await contentRes.text()}`);
      return file;
    }
    const buffer = await contentRes.arrayBuffer();
    if (buffer.byteLength > MAX_INLINE_BYTES) return file;
    const base64 = Buffer.from(buffer).toString("base64");
    return { ...file, dataUrl: `data:${mimeType};base64,${base64}` };
  });
