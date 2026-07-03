import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/hooks/use-partner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";
import { FORMATION_CATEGORIES, CERTIFICATE_TYPES } from "@/lib/formation-categories";

export const Route = createFileRoute("/_authenticated/partenaire/formations")({
  component: PartnerFormations,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground",
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  approved: "bg-green-500/20 text-green-700 dark:text-green-300",
  rejected: "bg-red-500/20 text-red-700 dark:text-red-300",
};

type Draft = {
  id?: string;
  title: string;
  description: string;
  category: string;
  specialization: string;
  school_id: string | null;
  learning_track_id: string | null;
  duration_id: string | null;
  certificate_type: string;
  cover_url: string;
  youtube_url: string;
  level: string;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "",
  specialization: "",
  school_id: null,
  learning_track_id: null,
  duration_id: null,
  certificate_type: "attestation",
  cover_url: "",
  youtube_url: "",
  level: "debutant",
};

function PartnerFormations() {
  const { partner } = usePartner();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  const { data: formations } = useQuery({
    queryKey: ["partner-formations", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formations")
        .select("*")
        .eq("owner_partner_id", partner!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: schools } = useQuery({
    queryKey: ["ref-schools"],
    queryFn: async () => (await supabase.from("schools").select("id,name").eq("is_active", true).order("display_order")).data ?? [],
  });
  const { data: tracks } = useQuery({
    queryKey: ["ref-tracks"],
    queryFn: async () => (await supabase.from("learning_tracks").select("id,label").eq("is_active", true).order("display_order")).data ?? [],
  });
  const { data: durations } = useQuery({
    queryKey: ["ref-durations"],
    queryFn: async () => (await supabase.from("course_durations").select("id,name").eq("is_active", true).order("display_order")).data ?? [],
  });

  const openNew = () => {
    setEditing({ ...emptyDraft });
    setStep(1);
    setOpen(true);
  };

  const openEdit = (f: any) => {
    setEditing({
      id: f.id,
      title: f.title ?? "",
      description: f.description ?? "",
      category: f.category ?? "",
      specialization: f.specialization ?? "",
      school_id: f.school_id,
      learning_track_id: f.learning_track_id,
      duration_id: f.duration_id,
      certificate_type: f.certificate_type ?? "attestation",
      cover_url: f.cover_url ?? "",
      youtube_url: f.youtube_url ?? "",
      level: f.level ?? "debutant",
    });
    setStep(1);
    setOpen(true);
  };

  const validate = (d: Draft): string | null => {
    if (!d.category) return "Choisissez une catégorie";
    if (!d.specialization.trim()) return "Renseignez la spécialisation";
    if (!d.title.trim()) return "Titre requis";
    if (!d.school_id) return "Choisissez une école";
    if (!d.certificate_type) return "Choisissez un type de certificat";
    if (!d.youtube_url.trim()) return "URL YouTube (bande-annonce du Module 1) requise";
    return null;
  };

  const save = async () => {
    if (!editing) return;
    const err = validate(editing);
    if (err) { toast.error(err); return; }
    const payload = {
      title: editing.title.trim(),
      description: editing.description.trim() || null,
      category: editing.category,
      specialization: editing.specialization.trim(),
      school_id: editing.school_id,
      learning_track_id: editing.learning_track_id,
      duration_id: editing.duration_id,
      certificate_type: editing.certificate_type,
      cover_url: editing.cover_url.trim() || null,
      youtube_url: editing.youtube_url.trim() || null,
      level: editing.level || null,
      owner_partner_id: partner!.id,
      status: "pending",
    };
    let error;
    let newId: string | undefined;
    if (editing.id) {
      ({ error } = await supabase.from("formations").update(payload).eq("id", editing.id));
    } else {
      const res = await supabase.from("formations").insert(payload).select("id").single();
      error = res.error;
      newId = res.data?.id;
    }
    if (error) return toast.error(error.message);

    // Attach the YouTube URL to Module 1 (auto-created by trigger) as a video row
    if (newId && editing.youtube_url.trim()) {
      const { data: mod1 } = await supabase
        .from("modules")
        .select("id")
        .eq("formation_id", newId)
        .eq("display_order", 1)
        .maybeSingle();
      if (mod1) {
        const ytId = extractYoutubeId(editing.youtube_url.trim());
        if (ytId) {
          await supabase.from("videos").insert({
            module_id: mod1.id,
            youtube_video_id: ytId,
            title: "Présentation",
            position: 1,
          });
        }
      }
    }

    toast.success(editing.id ? "Formation mise à jour (en attente de validation)" : "Formation créée — Module 1 gratuit ajouté automatiquement (en attente)");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["partner-formations"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette formation ? Ses modules seront également supprimés.")) return;
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Formation supprimée");
    qc.invalidateQueries({ queryKey: ["partner-formations"] });
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            Vos formations passent en <b>attente de validation</b> par l'administrateur. Le <b>Module 1</b> est <b>gratuit</b> et créé automatiquement.
          </p>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle formation</Button>
      </div>

      <div className="grid gap-3">
        {(formations ?? []).map((f: any) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{f.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {f.category ? `${f.category}` : "—"}{f.specialization ? ` · ${f.specialization}` : ""}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                  <Badge className={STATUS_COLORS[f.status] ?? ""}>{f.status}</Badge>
                  {f.certificate_type && <Badge variant="outline">{f.certificate_type}</Badge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Link to="/partenaire/modules" search={{ formation: f.id } as any}>
                  <Button size="sm" variant="secondary"><BookOpen className="h-4 w-4 mr-1" />Modules</Button>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => openEdit(f)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {(!formations || formations.length === 0) && (
          <div className="text-center text-muted-foreground py-12 border rounded-lg">
            Aucune formation. Créez-en une pour commencer.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} formation — Étape {step}/3</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {step === 1 && (
                <>
                  <div className="p-3 rounded-md bg-muted/50 text-xs text-muted-foreground flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    Étape 1 : catégorie (obligatoire) puis spécialisation libre.
                  </div>
                  <div>
                    <Label>Catégorie *</Label>
                    <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {FORMATION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Spécialisation *</Label>
                    <Input placeholder="Ex : Anglais, Excel, WordPress…" value={editing.specialization} onChange={(e) => setEditing({ ...editing, specialization: e.target.value })} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!editing.category || !editing.specialization.trim()}>Suivant</Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <Label>Titre de la formation *</Label>
                    <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>École *</Label>
                      <Select value={editing.school_id ?? ""} onValueChange={(v) => setEditing({ ...editing, school_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                        <SelectContent>
                          {(schools ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Certificat *</Label>
                      <Select value={editing.certificate_type} onValueChange={(v) => setEditing({ ...editing, certificate_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CERTIFICATE_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type d'apprentissage</Label>
                      <Select value={editing.learning_track_id ?? ""} onValueChange={(v) => setEditing({ ...editing, learning_track_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                        <SelectContent>
                          {(tracks ?? []).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Durée</Label>
                      <Select value={editing.duration_id ?? ""} onValueChange={(v) => setEditing({ ...editing, duration_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                        <SelectContent>
                          {(durations ?? []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                    <Button onClick={() => setStep(3)} disabled={!editing.title.trim() || !editing.school_id}>Suivant</Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="p-3 rounded-md bg-primary/10 text-xs flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <div>
                      Le <b>Module 1</b> gratuit sera créé automatiquement avec la vidéo YouTube ci-dessous
                      (présentation, objectifs, introduction).
                    </div>
                  </div>
                  <div>
                    <Label>URL YouTube du Module 1 * (bande-annonce)</Label>
                    <Input placeholder="https://youtube.com/watch?v=..." value={editing.youtube_url} onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>URL de couverture (image)</Label>
                    <Input placeholder="https://..." value={editing.cover_url} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Input value={editing.level} onChange={(e) => setEditing({ ...editing, level: e.target.value })} />
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
                    <Button onClick={save}>{editing.id ? "Enregistrer" : "Créer la formation"}</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
