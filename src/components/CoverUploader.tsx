import { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { resolveCoverUrl } from "@/lib/cover-url";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img load")); });
  // Output 1280x720 (16:9)
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 1280, 720);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export function CoverUploader({ formation, onSaved }: { formation: { id: string; title?: string | null; cover_url?: string | null }; onSaved: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { resolveCoverUrl(formation).then(setPreview); }, [formation.id, formation.cover_url]);

  const onPick = (file: File) => {
    if (!ACCEPTED.includes(file.type)) return toast.error("Format non supporté (JPG, PNG, WEBP)");
    if (file.size > MAX_BYTES) return toast.error("Image trop volumineuse (max 10 MB)");
    const reader = new FileReader();
    reader.onload = () => setPickedSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const saveCrop = async () => {
    if (!pickedSrc || !area) return;
    setSaving(true);
    try {
      const blob = await cropToBlob(pickedSrc, area);
      const path = `${formation.id}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("formation-covers").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      // Delete previous if it was a storage path
      const prev = formation.cover_url?.trim();
      if (prev && !/^https?:\/\//i.test(prev)) {
        await supabase.storage.from("formation-covers").remove([prev]);
      }
      const { error: upErr } = await supabase.from("formations").update({ cover_url: path }).eq("id", formation.id);
      if (upErr) throw upErr;
      toast.success("Couverture mise à jour");
      setPickedSrc(null); setZoom(1); setCrop({ x: 0, y: 0 });
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Échec de l'upload");
    } finally { setSaving(false); }
  };

  const removeCover = async () => {
    setSaving(true);
    try {
      const prev = formation.cover_url?.trim();
      if (prev && !/^https?:\/\//i.test(prev)) {
        await supabase.storage.from("formation-covers").remove([prev]);
      }
      await supabase.from("formations").update({ cover_url: null }).eq("id", formation.id);
      toast.success("Couverture supprimée");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="aspect-video w-48 rounded-md overflow-hidden bg-muted border shrink-0">
          {preview && <img src={preview} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }} />
            <Button asChild size="sm" variant="outline"><span><Upload className="w-4 h-4 mr-1" />Téléverser une image</span></Button>
          </label>
          {formation.cover_url && (
            <Button size="sm" variant="ghost" onClick={removeCover} disabled={saving}><Trash2 className="w-4 h-4 mr-1" />Supprimer</Button>
          )}
          <p className="text-xs text-muted-foreground">JPG/PNG/WEBP • max 10 MB • recadrage 16:9</p>
        </div>
      </div>

      <Dialog open={!!pickedSrc} onOpenChange={(o) => !o && setPickedSrc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Recadrer la couverture (16:9)</DialogTitle></DialogHeader>
          <div className="relative w-full h-[60vh] bg-black rounded">
            {pickedSrc && (
              <Cropper image={pickedSrc} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground w-12">Zoom</span>
            <Slider value={[zoom]} min={1} max={4} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedSrc(null)} disabled={saving}>Annuler</Button>
            <Button onClick={saveCrop} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
