import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, GraduationCap, Award, BookOpen, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type F = { id: string; title: string };

const TRACK_ICONS: Record<string, any> = {
  tsotra: BookOpen,
  certificat: Award,
  diplome_equiv: GraduationCap,
  diplome: Trophy,
};

export function HianatraDialog({ open, onOpenChange, formation }: { open: boolean; onOpenChange: (v: boolean) => void; formation: F }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [durationId, setDurationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: tracks } = useQuery({
    queryKey: ["tracks"],
    queryFn: async () => (await supabase.from("learning_tracks").select("*").eq("is_active", true).order("display_order")).data ?? [],
  });
  const { data: schools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => (await supabase.from("schools").select("*").eq("is_active", true).order("display_order")).data ?? [],
  });
  const { data: durations } = useQuery({
    queryKey: ["durations"],
    queryFn: async () => (await supabase.from("course_durations").select("*").eq("is_active", true).order("display_order")).data ?? [],
  });

  const reset = () => { setStep(0); setTrackId(null); setSchoolId(null); setDurationId(null); };

  const confirm = async () => {
    if (!user) { toast.error("Veuillez vous connecter"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("formation_enrollments").upsert({
      user_id: user.id, formation_id: formation.id, track_id: trackId, school_id: schoolId, duration_id: durationId, status: "active",
    }, { onConflict: "user_id,formation_id" });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Inscription enregistrée 🎓");
    onOpenChange(false);
    reset();
    navigate({ to: "/formations/$id", params: { id: formation.id } });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">🎓 {formation.title}</DialogTitle>
          <div className="flex items-center gap-1.5 mt-2">
            {["Type", "École", "Durée", "Confirmer"].map((label, i) => (
              <div key={i} className="flex-1 flex items-center gap-1">
                <div className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
            {["Type", "École", "Durée", "Confirmer"].map((l) => <span key={l}>{l}</span>)}
          </div>
        </DialogHeader>

        {step === 0 && (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground mb-1">Choisissez votre type d'apprentissage :</p>
            {tracks?.map((tr: any) => {
              const Icon = TRACK_ICONS[tr.code] ?? BookOpen;
              const active = trackId === tr.id;
              return (
                <button key={tr.id} onClick={() => setTrackId(tr.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div className={`h-10 w-10 rounded-lg grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Icon className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <p className="font-semibold">{tr.label}</p>
                    {tr.description && <p className="text-xs text-muted-foreground">{tr.description}</p>}
                  </div>
                  {active && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-muted-foreground mb-1">Choisissez une école :</p>
            {(!schools || schools.length === 0) && <p className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg">Aucune école configurée. Demandez à l'administrateur d'en ajouter.</p>}
            {schools?.map((sc: any) => {
              const active = schoolId === sc.id;
              return (
                <button key={sc.id} onClick={() => setSchoolId(sc.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  {sc.logo_url ? <img src={sc.logo_url} alt={sc.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center text-white font-bold">{sc.name[0]}</div>}
                  <div className="flex-1">
                    <p className="font-semibold">{sc.name}</p>
                    <p className="text-xs text-muted-foreground">{sc.country}{sc.description ? ` • ${sc.description}` : ""}</p>
                  </div>
                  {active && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground mb-1">Choisissez la durée :</p>
            {durations?.map((d: any) => {
              const active = durationId === d.id;
              return (
                <button key={d.id} onClick={() => setDurationId(d.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.description}{d.duration_weeks ? ` • ${d.duration_weeks} semaines` : ""}</p>
                  </div>
                  {active && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Récapitulatif :</p>
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <p><span className="text-muted-foreground">Formation :</span> <strong>{formation.title}</strong></p>
              <p><span className="text-muted-foreground">Type :</span> <strong>{tracks?.find((t: any) => t.id === trackId)?.label}</strong></p>
              <p><span className="text-muted-foreground">École :</span> <strong>{schools?.find((s: any) => s.id === schoolId)?.name ?? "—"}</strong></p>
              <p><span className="text-muted-foreground">Durée :</span> <strong>{durations?.find((d: any) => d.id === durationId)?.name}</strong></p>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={() => (step > 0 ? setStep(step - 1) : onOpenChange(false))}>
            {step === 0 ? "Annuler" : "Retour"}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}
              disabled={(step === 0 && !trackId) || (step === 1 && !schoolId && (schools?.length ?? 0) > 0) || (step === 2 && !durationId)}
              className="bg-gradient-primary gap-1">
              Suivant <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={confirm} disabled={submitting} className="bg-gradient-primary gap-2">
              <GraduationCap className="h-4 w-4" /> {submitting ? "..." : "Commencer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
