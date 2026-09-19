import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Upload, Eye, Briefcase, GraduationCap, Star } from "lucide-react";

type Profile = {
  headline: string | null;
  cv_bio: string | null;
  location: string | null;
  cv_document_url: string | null;
  phone: string | null;
};

export function StudentCvSection({ profile }: { profile: Profile | null | undefined }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [cvBio, setCvBio] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (profile) {
      setHeadline(profile.headline ?? "");
      setLocation(profile.location ?? "");
      setCvBio(profile.cv_bio ?? "");
    }
  }, [profile]);

  const refreshProfile = () => qc.invalidateQueries({ queryKey: ["profile"] });

  const saveInfo = async () => {
    if (!user) return;
    if (headline.length > 120) return toast.error("Titre trop long (120 caractères max)");
    if (cvBio.length > 2000) return toast.error("Présentation trop longue (2000 caractères max)");
    setSavingInfo(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        headline: headline.trim() || null,
        location: location.trim() || null,
        cv_bio: cvBio.trim() || null,
      })
      .eq("id", user.id);
    setSavingInfo(false);
    if (error) return toast.error(error.message);
    refreshProfile();
    toast.success("CV mis à jour");
  };

  // ---------- Document CV ----------
  const uploadCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Fichier trop lourd (10 Mo max)");
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase();
    if (!["pdf", "doc", "docx"].includes(ext)) return toast.error("Formats acceptés : PDF, DOC, DOCX");
    const path = `${user.id}/cv-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("student-cv").upload(path, file);
    if (error) return toast.error(error.message);
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ cv_document_url: path })
      .eq("id", user.id);
    if (pErr) return toast.error(pErr.message);
    refreshProfile();
    toast.success("CV téléversé");
  };

  const openCv = async () => {
    if (!profile?.cv_document_url) return;
    const { data, error } = await supabase.storage
      .from("student-cv")
      .createSignedUrl(profile.cv_document_url, 3600);
    if (error || !data?.signedUrl) return toast.error("Impossible d'ouvrir le document");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const removeCv = async () => {
    if (!user || !profile?.cv_document_url) return;
    await supabase.storage.from("student-cv").remove([profile.cv_document_url]);
    await supabase.from("profiles").update({ cv_document_url: null }).eq("id", user.id);
    refreshProfile();
    toast.success("Document supprimé");
  };

  // ---------- Expériences ----------
  const { data: experiences } = useQuery({
    queryKey: ["cv-experiences", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase
        .from("student_experiences")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })).data ?? [],
  });

  const [expDraft, setExpDraft] = useState<any | null>(null);

  const saveExp = async () => {
    if (!user || !expDraft?.title?.trim()) return toast.error("Le poste est obligatoire");
    const payload = {
      user_id: user.id,
      title: expDraft.title.trim().slice(0, 150),
      company: expDraft.company?.trim() || null,
      location: expDraft.location?.trim() || null,
      start_date: expDraft.start_date?.trim() || null,
      end_date: expDraft.is_current ? null : expDraft.end_date?.trim() || null,
      is_current: !!expDraft.is_current,
      description: expDraft.description?.trim()?.slice(0, 1500) || null,
    };
    const { error } = expDraft.id
      ? await supabase.from("student_experiences").update(payload).eq("id", expDraft.id)
      : await supabase.from("student_experiences").insert(payload);
    if (error) return toast.error(error.message);
    setExpDraft(null);
    qc.invalidateQueries({ queryKey: ["cv-experiences"] });
    toast.success("Expérience enregistrée");
  };

  const deleteExp = async (id: string) => {
    const { error } = await supabase.from("student_experiences").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cv-experiences"] });
  };

  // ---------- Diplômes ----------
  const { data: education } = useQuery({
    queryKey: ["cv-education", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase
        .from("student_education")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })).data ?? [],
  });

  const [eduDraft, setEduDraft] = useState<any | null>(null);

  const saveEdu = async () => {
    if (!user || !eduDraft?.school?.trim()) return toast.error("L'établissement est obligatoire");
    const payload = {
      user_id: user.id,
      school: eduDraft.school.trim().slice(0, 150),
      degree: eduDraft.degree?.trim() || null,
      field: eduDraft.field?.trim() || null,
      start_date: eduDraft.start_date?.trim() || null,
      end_date: eduDraft.end_date?.trim() || null,
      description: eduDraft.description?.trim()?.slice(0, 1000) || null,
    };
    const { error } = eduDraft.id
      ? await supabase.from("student_education").update(payload).eq("id", eduDraft.id)
      : await supabase.from("student_education").insert(payload);
    if (error) return toast.error(error.message);
    setEduDraft(null);
    qc.invalidateQueries({ queryKey: ["cv-education"] });
    toast.success("Diplôme enregistré");
  };

  const deleteEdu = async (id: string) => {
    const { error } = await supabase.from("student_education").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cv-education"] });
  };

  // ---------- Compétences ----------
  const { data: skills } = useQuery({
    queryKey: ["cv-skills", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase
        .from("student_skills")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })).data ?? [],
  });

  const [skillLabel, setSkillLabel] = useState("");
  const [skillLevel, setSkillLevel] = useState(3);

  const addSkill = async () => {
    if (!user || !skillLabel.trim()) return;
    const { error } = await supabase.from("student_skills").insert({
      user_id: user.id,
      label: skillLabel.trim().slice(0, 60),
      level: skillLevel,
    });
    if (error) return toast.error(error.message);
    setSkillLabel("");
    setSkillLevel(3);
    qc.invalidateQueries({ queryKey: ["cv-skills"] });
  };

  const deleteSkill = async (id: string) => {
    const { error } = await supabase.from("student_skills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cv-skills"] });
  };

  return (
    <div className="max-w-2xl mt-6 space-y-6">
      {/* Présentation */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Mon CV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Titre professionnel</Label>
            <Input
              value={headline}
              maxLength={120}
              placeholder="Ex. Community manager junior"
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>
          <div>
            <Label>Ville / Pays</Label>
            <Input
              value={location}
              maxLength={100}
              placeholder="Antananarivo, Madagascar"
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <Label>À propos de moi</Label>
            <Textarea
              rows={4}
              maxLength={2000}
              value={cvBio}
              placeholder="Quelques lignes sur votre parcours et vos objectifs."
              onChange={(e) => setCvBio(e.target.value)}
            />
          </div>
          <Button onClick={saveInfo} disabled={savingInfo} className="bg-gradient-primary">
            {savingInfo ? "Enregistrement..." : "Enregistrer mon CV"}
          </Button>
        </CardContent>
      </Card>

      {/* Document */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Document CV (PDF / Word)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile?.cv_document_url ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm truncate flex-1 min-w-0">
                {profile.cv_document_url.split("/").pop()}
              </span>
              <Button size="sm" variant="outline" onClick={openCv} className="gap-1">
                <Eye className="h-4 w-4" /> Ouvrir
              </Button>
              <Button size="sm" variant="ghost" onClick={removeCv} aria-label="supprimer le CV">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun document téléversé.</p>
          )}
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> {profile?.cv_document_url ? "Remplacer" : "Téléverser mon CV"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={uploadCv}
          />
          <p className="text-xs text-muted-foreground">
            Votre document reste privé : vous seul pouvez l'ouvrir. 10 Mo maximum.
          </p>
        </CardContent>
      </Card>

      {/* Expériences */}
      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-5 w-5 text-primary" /> Expériences
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setExpDraft({})}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {expDraft && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div>
                <Label>Poste *</Label>
                <Input
                  value={expDraft.title ?? ""}
                  onChange={(e) => setExpDraft({ ...expDraft, title: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Entreprise</Label>
                  <Input
                    value={expDraft.company ?? ""}
                    onChange={(e) => setExpDraft({ ...expDraft, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lieu</Label>
                  <Input
                    value={expDraft.location ?? ""}
                    onChange={(e) => setExpDraft({ ...expDraft, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Début</Label>
                  <Input
                    placeholder="01/2024"
                    value={expDraft.start_date ?? ""}
                    onChange={(e) => setExpDraft({ ...expDraft, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input
                    placeholder="06/2025"
                    disabled={!!expDraft.is_current}
                    value={expDraft.end_date ?? ""}
                    onChange={(e) => setExpDraft({ ...expDraft, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exp-current"
                  checked={!!expDraft.is_current}
                  onCheckedChange={(v) => setExpDraft({ ...expDraft, is_current: !!v })}
                />
                <Label htmlFor="exp-current">Poste actuel</Label>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={expDraft.description ?? ""}
                  onChange={(e) => setExpDraft({ ...expDraft, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveExp}>Enregistrer</Button>
                <Button variant="ghost" onClick={() => setExpDraft(null)}>Annuler</Button>
              </div>
            </div>
          )}

          {(experiences ?? []).map((x: any) => (
            <div key={x.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{x.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[x.company, x.location].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {x.start_date ?? ""}
                    {x.is_current ? " → aujourd'hui" : x.end_date ? ` → ${x.end_date}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setExpDraft(x)}>Modifier</Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteExp(x.id)} aria-label="supprimer">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {x.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{x.description}</p>
              )}
            </div>
          ))}
          {!expDraft && !(experiences ?? []).length && (
            <p className="text-sm text-muted-foreground">Aucune expérience ajoutée.</p>
          )}
        </CardContent>
      </Card>

      {/* Diplômes */}
      <Card className="shadow-card">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-primary" /> Formations & diplômes
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setEduDraft({})}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {eduDraft && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div>
                <Label>Établissement *</Label>
                <Input
                  value={eduDraft.school ?? ""}
                  onChange={(e) => setEduDraft({ ...eduDraft, school: e.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Diplôme</Label>
                  <Input
                    value={eduDraft.degree ?? ""}
                    onChange={(e) => setEduDraft({ ...eduDraft, degree: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Spécialité</Label>
                  <Input
                    value={eduDraft.field ?? ""}
                    onChange={(e) => setEduDraft({ ...eduDraft, field: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Début</Label>
                  <Input
                    placeholder="2021"
                    value={eduDraft.start_date ?? ""}
                    onChange={(e) => setEduDraft({ ...eduDraft, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input
                    placeholder="2024"
                    value={eduDraft.end_date ?? ""}
                    onChange={(e) => setEduDraft({ ...eduDraft, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdu}>Enregistrer</Button>
                <Button variant="ghost" onClick={() => setEduDraft(null)}>Annuler</Button>
              </div>
            </div>
          )}

          {(education ?? []).map((x: any) => (
            <div key={x.id} className="rounded-lg border p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{x.school}</p>
                <p className="text-xs text-muted-foreground">
                  {[x.degree, x.field].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[x.start_date, x.end_date].filter(Boolean).join(" → ")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEduDraft(x)}>Modifier</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteEdu(x.id)} aria-label="supprimer">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {!eduDraft && !(education ?? []).length && (
            <p className="text-sm text-muted-foreground">Aucun diplôme ajouté.</p>
          )}
        </CardContent>
      </Card>

      {/* Compétences */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-gold" /> Compétences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(skills ?? []).map((s: any) => (
              <Badge key={s.id} variant="secondary" className="gap-1 py-1">
                {s.label} · {"★".repeat(s.level)}
                <button onClick={() => deleteSkill(s.id)} aria-label="supprimer la compétence">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </Badge>
            ))}
            {!(skills ?? []).length && (
              <p className="text-sm text-muted-foreground">Aucune compétence ajoutée.</p>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[140px]">
              <Label>Compétence</Label>
              <Input
                value={skillLabel}
                maxLength={60}
                placeholder="Ex. Canva"
                onChange={(e) => setSkillLabel(e.target.value)}
              />
            </div>
            <div>
              <Label>Niveau</Label>
              <select
                className="h-10 w-20 rounded-md border bg-background px-2 text-sm"
                value={skillLevel}
                onChange={(e) => setSkillLevel(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <Button onClick={addSkill} className="gap-1">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
