import { createFileRoute } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/offres")({
  component: PartnerOffers,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground",
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  approved: "bg-green-500/20 text-green-700 dark:text-green-300",
  rejected: "bg-red-500/20 text-red-700 dark:text-red-300",
  closed: "bg-muted text-muted-foreground",
};

function PartnerOffers() {
  const { partner } = usePartner();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState<string | null>(null);

  const { data: offers } = useQuery({
    queryKey: ["partner-offers", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_offers")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: apps } = useQuery({
    queryKey: ["job-apps", appsOpen],
    enabled: !!appsOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from("job_applications")
        .select("*, profiles:user_id(full_name, email)")
        .eq("job_id", appsOpen!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const openNew = () => {
    setEditing({
      title: "", description: "", location: "", contract_type: "CDI",
      salary_range: "", requires_cv: true, requires_portfolio: false,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.title?.trim()) return toast.error("Titre requis");
    const payload = {
      partner_id: partner!.id,
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      location: editing.location?.trim() || null,
      contract_type: editing.contract_type || null,
      salary_range: editing.salary_range?.trim() || null,
      requires_cv: !!editing.requires_cv,
      requires_portfolio: !!editing.requires_portfolio,
      status: "pending",
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("job_offers").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("job_offers").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Offre mise à jour" : "Offre créée");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["partner-offers"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette offre ?")) return;
    const { error } = await supabase.from("job_offers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    qc.invalidateQueries({ queryKey: ["partner-offers"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Les offres sont validées par l'administrateur avant publication.</p>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle offre</Button>
      </div>

      <div className="grid gap-3">
        {(offers ?? []).map((o: any) => (
          <Card key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{o.title}</div>
                <div className="text-xs text-muted-foreground">
                  {o.location} · {o.contract_type} {o.salary_range && `· ${o.salary_range}`}
                </div>
                <div className="mt-2">
                  <Badge className={STATUS_COLORS[o.status] ?? ""}>{o.status}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setAppsOpen(o.id)} title="Candidatures">
                  <Users className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(o.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {(!offers || offers.length === 0) && (
          <div className="text-center text-muted-foreground py-12 border rounded-lg">
            Aucune offre. Publiez-en une pour recevoir des candidatures.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} offre</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Titre du poste *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Localisation</Label>
                  <Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
                </div>
                <div>
                  <Label>Type de contrat</Label>
                  <Input value={editing.contract_type ?? ""} onChange={(e) => setEditing({ ...editing, contract_type: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Salaire</Label>
                <Input value={editing.salary_range ?? ""} onChange={(e) => setEditing({ ...editing, salary_range: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editing.requires_cv} onCheckedChange={(v) => setEditing({ ...editing, requires_cv: !!v })} id="cv" />
                <Label htmlFor="cv">CV obligatoire</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editing.requires_portfolio} onCheckedChange={(v) => setEditing({ ...editing, requires_portfolio: !!v })} id="pf" />
                <Label htmlFor="pf">Portfolio obligatoire</Label>
              </div>
              <Button onClick={save} className="w-full">Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!appsOpen} onOpenChange={(o) => !o && setAppsOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidatures</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(apps ?? []).map((a: any) => (
              <div key={a.id} className="p-3 border rounded-lg">
                <div className="font-medium">{a.profiles?.full_name || a.profiles?.email || a.user_id.slice(0,8)}</div>
                <div className="text-xs text-muted-foreground mb-2">{a.profiles?.email}</div>
                {a.cover_letter && <div className="text-sm whitespace-pre-wrap">{a.cover_letter}</div>}
                <div className="mt-2 flex gap-2 items-center">
                  <Badge>{a.status}</Badge>
                  <select
                    className="text-xs border rounded px-2 py-1 bg-background"
                    value={a.status}
                    onChange={async (e) => {
                      await supabase.from("job_applications").update({ status: e.target.value }).eq("id", a.id);
                      qc.invalidateQueries({ queryKey: ["job-apps"] });
                    }}
                  >
                    <option value="submitted">Reçue</option>
                    <option value="reviewing">En examen</option>
                    <option value="interview">Entretien</option>
                    <option value="accepted">Acceptée</option>
                    <option value="rejected">Refusée</option>
                  </select>
                </div>
              </div>
            ))}
            {(!apps || apps.length === 0) && (
              <div className="text-center text-muted-foreground py-8">Aucune candidature.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
