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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CheckCircle2, AlertCircle, BookOpen, School as SchoolIcon } from "lucide-react";
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
  certificate_types: string[];
  duration_text: string;
  cover_url: string;
  youtube_url: string;
  level: string;
};

const emptyDraft: Draft = {
  title: "", description: "", category: "", specialization: "",
  certificate_types: [], duration_text: "",
  cover_url: "", youtube_url: "", level: "debutant",
};

function PartnerFormations() {
  const { partner } = usePartner();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  const { data: mySchool } = useQuery({
    queryKey: ["my-school", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("*")
        .eq("owner_partner_id", partner!.id).maybeSingle();
      return data;
    },
  });

  const { data: formations } = useQuery({
    queryKey: ["partner-formations", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data, error } = await supabase.from("formations").select("*")
        .eq("owner_partner_id", partner!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const openNew = () => {
    if (!mySchool) {
      toast.error("Créez d'abord votre école avant d'ajouter une formation.");
      return;
    }
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
      certificate_types: f.certificate_types ?? [],
      duration_text: f.duration_text ?? "",
      cover_url: f.cover_url ?? "",
      youtube_url: f.youtube_url ?? "",
      level: f.level ?? "debutant",
    });
    setStep(1);
    setOpen(true);
  };

  const canPublish = (d: Draft): string | null => {
    if (!mySchool) return "Vous devez d'abord créer votre école.";
    if (!d.category) return "Choisissez une catégorie";
    if (!d.specialization.trim()) return "Renseignez la sous-catégorie (spécialisation)";
    if (!d.title.trim()) return "Titre de la formation requis";
    if (d.certificate_types.length === 0) return "Sélectionnez au moins un type de certificat";
    if (!d.duration_text.trim()) return "Renseignez la durée de la formation";
    if (!d.youtube_url.trim()) return "URL YouTube du Module 1 requise";
    return null;
  };

  const save = async () => {
    if (!editing || !partner || !mySchool) return;
    const err = canPublish(editing);
    if (err) { toast.error(err); return; }
    const payload: any = {
      title: editing.title.trim(),
      description: editing.description.trim() || null,
      category: editing.category,
      specialization: editing.specialization.trim(),
      school_id: (mySchool as any).id,
      certificate_types: editing.certificate_types,
      duration_text: editing.duration_text.trim(),
      cover_url: editing.cover_url.trim() || null,
      youtube_url: editing.youtube_url.trim() || null,
      level: editing.level || null,
      owner_partner_id: partner.id,
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

    if (newId && editing.youtube_url.trim()) {
      const { data: mod1 } = await supabase.from("modules").select("id")
        .eq("formation_id", newId).eq("display_order", 1).maybeSingle();
      if (mod1) {
        const ytId = extractYoutubeId(editing.youtube_url.trim());
        if (ytId) {
          await supabase.from("videos").insert({
            module_id: mod1.id, youtube_video_id: ytId,
            title: "Présentation", position: 1,
          });
        }
      }
    }

    toast.success(editing.id ? "Formation mise à jour" : "Formation créée — Module 1 gratuit ajouté (en attente de validation)");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["partner-formations"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return;
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Formation supprimée");
    qc.invalidateQueries({ queryKey: ["partner-formations"] });
  };

  const toggleCert = (v: string) => {
    if (!editing) return;
    const has = editing.certificate_types.includes(v);
    setEditing({
      ...editing,
      certificate_types: has
        ? editing.certificate_types.filter((c) => c !== v)
        : [...editing.certificate_types, v],
    });
  };

  return (
    <div>
      {!mySchool && (
        <Card className="p-4 mb-4 border-yellow-500/40 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <SchoolIcon className="h-5 w-5 text-yellow-700 dark:text-yellow-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-sm">Créez d'abord votre école</div>
              <p className="text-xs text-muted-foreground mb-2">
                Chaque formation doit être rattachée à votre école / centre de formation.
              </p>
              <Link to="/partenaire/ecoles"><Button size="sm">Créer mon école</Button></Link>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Vos formations passent en <b>attente de validation</b>. Le <b>Module 1</b> est <b>gratuit</b> et créé automatiquement.
        </p>
        <Button onClick={openNew} size="sm" disabled={!mySchool}><Plus className="h-4 w-4 mr-1" /> Nouvelle formation</Button>
      </div>

      <div className="grid gap-3">
        {(formations ?? []).map((f: any) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{f.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {f.category ?? "—"}{f.specialization ? ` · ${f.specialization}` : ""}
                  {f.duration_text ? ` · ${f.duration_text}` : ""}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
                  <Badge className={STATUS_COLORS[f.status] ?? ""}>{f.status}</Badge>
                  {(f.certificate_types ?? []).map((c: string) => {
                    const lbl = CERTIFICATE_TYPES.find((x) => x.value === c)?.label ?? c;
                    return <Badge key={c} variant="outline">{lbl}</Badge>;
                  })}
                </div>
              </div>
              <div className="flex gap-1">
                <Link to="/partenaire/modules" search={{ formation: f.id } as any}>
                  <Button size="sm" variant="secondary"><BookOpen className="h-4 w-4 mr-1" />Modules</Button>
                </Link>
                <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Edit className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} formation — Étape {step}/5</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <StepNav step={step} />

              {step === 1 && (
                <>
                  <SectionHint icon={<AlertCircle className="h-4 w-4" />}>
                    Étape 1 — Informations générales : catégorie, sous-catégorie et titre.
                  </SectionHint>
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
                    <Label>Sous-catégorie / spécialisation *</Label>
                    <Input placeholder="Ex : Anglais, Excel, WordPress…" value={editing.specialization} onChange={(e) => setEditing({ ...editing, specialization: e.target.value })} />
                  </div>
                  <div>
                    <Label>Titre de la formation *</Label>
                    <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <Select value={editing.level} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debutant">Débutant</SelectItem>
                        <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                        <SelectItem value="avance">Avancé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!editing.category || !editing.specialization.trim() || !editing.title.trim()}>Suivant</Button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <SectionHint icon={<SchoolIcon className="h-4 w-4" />}>
                    Étape 2 — École : la formation sera liée automatiquement à votre école.
                  </SectionHint>
                  {mySchool ? (
                    <Card className="p-3 flex items-center gap-3">
                      {(mySchool as any).logo_url && <img src={(mySchool as any).logo_url} className="h-10 w-10 rounded object-cover" alt="" />}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{(mySchool as any).name}</div>
                        <div className="text-xs text-muted-foreground">{(mySchool as any).city} {(mySchool as any).country}</div>
                      </div>
                      <Badge variant="outline" className="ml-auto">{(mySchool as any).status}</Badge>
                    </Card>
                  ) : (
                    <div className="text-sm text-destructive">Aucune école. <Link to="/partenaire/ecoles" className="underline">Créer maintenant</Link></div>
                  )}
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                    <Button onClick={() => setStep(3)} disabled={!mySchool}>Suivant</Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <SectionHint icon={<CheckCircle2 className="h-4 w-4" />}>
                    Étape 3 — Certifications : cochez tous les types délivrés à la fin.
                  </SectionHint>
                  <div className="space-y-2">
                    {CERTIFICATE_TYPES.map((c) => (
                      <label key={c.value} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                        <Checkbox checked={editing.certificate_types.includes(c.value)} onCheckedChange={() => toggleCert(c.value)} />
                        <span className="text-sm">{c.label}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <Label>Durée de la formation *</Label>
                    <Input placeholder="Ex : 2 semaines, 3 mois, 120 heures, Formation continue…" value={editing.duration_text} onChange={(e) => setEditing({ ...editing, duration_text: e.target.value })} />
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
                    <Button onClick={() => setStep(4)} disabled={editing.certificate_types.length === 0 || !editing.duration_text.trim()}>Suivant</Button>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <SectionHint icon={<CheckCircle2 className="h-4 w-4" />}>
                    Étape 4 — Module 1 gratuit : bande-annonce publique de présentation.
                  </SectionHint>
                  <div>
                    <Label>URL YouTube du Module 1 *</Label>
                    <Input placeholder="https://youtube.com/watch?v=..." value={editing.youtube_url} onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>URL de couverture (image)</Label>
                    <Input placeholder="https://..." value={editing.cover_url} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} />
                  </div>
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(3)}>Retour</Button>
                    <Button onClick={() => setStep(5)} disabled={!editing.youtube_url.trim()}>Suivant</Button>
                  </div>
                </>
              )}

              {step === 5 && (
                <>
                  <SectionHint icon={<CheckCircle2 className="h-4 w-4" />}>
                    Étape 5 — Publication : vérifiez et publiez. La formation sera envoyée pour validation.
                  </SectionHint>
                  <ChecklistSummary d={editing} school={mySchool as any} />
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(4)}>Retour</Button>
                    <Button onClick={save} disabled={!!canPublish(editing)}>
                      {editing.id ? "Enregistrer" : "Publier la formation"}
                    </Button>
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

function StepNav({ step }: { step: number }) {
  const labels = ["Infos", "École", "Certifs", "Module 1", "Publier"];
  return (
    <div className="flex items-center gap-1 text-xs">
      {labels.map((l, i) => (
        <div key={l} className={`flex-1 h-1.5 rounded ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} title={l} />
      ))}
    </div>
  );
}

function SectionHint({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-md bg-muted/50 text-xs text-muted-foreground flex gap-2">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function ChecklistSummary({ d, school }: { d: Draft; school: any }) {
  const items = [
    { ok: !!school, label: "École créée" },
    { ok: !!d.category, label: "Catégorie choisie" },
    { ok: !!d.specialization.trim(), label: "Sous-catégorie renseignée" },
    { ok: !!d.title.trim(), label: "Titre renseigné" },
    { ok: d.certificate_types.length > 0, label: "Au moins un certificat sélectionné" },
    { ok: !!d.duration_text.trim(), label: "Durée renseignée" },
    { ok: !!d.youtube_url.trim(), label: "Vidéo YouTube du Module 1" },
  ];
  return (
    <ul className="text-sm space-y-1">
      {items.map((it) => (
        <li key={it.label} className={`flex items-center gap-2 ${it.ok ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
          {it.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
