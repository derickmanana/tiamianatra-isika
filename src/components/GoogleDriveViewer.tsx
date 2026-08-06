import { useQuery } from "@tanstack/react-query";
import { File as FileIcon, ExternalLink, Loader2, Download } from "lucide-react";
import { getGoogleDriveFile } from "@/lib/google-drive.functions";

function humanSize(bytes?: number | null) {
  if (!bytes) return null;
  const units = ["o", "Ko", "Mo", "Go"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function GoogleDriveViewer({ url }: { url: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["google-drive-file", url],
    queryFn: () => getGoogleDriveFile({ data: { url } }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement du fichier Google Drive…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Impossible d'afficher ce fichier."}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans Google Drive
        </a>
      </div>
    );
  }

  const size = humanSize(data.size);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileIcon className="h-4 w-4 text-primary" />
        <span className="truncate">{data.name}</span>
        {size && <span className="text-xs font-normal text-muted-foreground">{size}</span>}
      </div>

      {data.dataUrl && data.mimeType.startsWith("image/") && (
        <img src={data.dataUrl} alt={data.name} className="max-h-[65vh] w-full rounded-md border object-contain bg-muted" />
      )}

      {data.dataUrl && !data.mimeType.startsWith("image/") && (
        <iframe
          src={data.dataUrl}
          title={data.name}
          className="w-full h-[65vh] rounded-md border bg-muted"
        />
      )}

      {!data.dataUrl && (
        <iframe
          src={`https://drive.google.com/file/d/${data.id}/preview`}
          title={data.name}
          allow="autoplay"
          className="w-full h-[65vh] rounded-md border bg-muted"
        />
      )}

      <div className="flex flex-wrap gap-4">
        <a
          href={data.webViewLink ?? url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Ouvrir dans Google Drive
        </a>
        {data.dataUrl && (
          <a
            href={data.dataUrl}
            download={data.name}
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger {data.name}
          </a>
        )}
      </div>
    </div>
  );
}
