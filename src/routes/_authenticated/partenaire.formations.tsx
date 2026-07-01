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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/formations")({
  component: PartnerFormations,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground",
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  approved: "bg-green-500/20 text-green-700 dark:text-green-300",
  rejected: "bg-red-500/20 text-red-700 dark:text-red-300",
};

function PartnerFormations() {
  const { partner } = usePartner();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

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

  const openNew = () => {
    setEditing({ title: "", description: "", price: 0, cover_url: "", youtube_url: "", level: "debutant" });
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast.error("Titre requis");
      return;
    }
    const payload = {
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      price: Number(editing.price) || 0,
      cover_url: editing.cover_url?.trim() || null,
      youtube_url: editing.youtube_url?.trim() || null,
      level: editing.level || null,
      owner_partner_id: partner!.id,
      status: "pending",
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("formations").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("formations").insert(payload));
    }
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Formation mise à jour (en attente)" : "Formation créée (en attente)");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["partner-formations"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette formation ?")) return;
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimée");
    qc.invalidateQueries({ queryKey: ["partner-formations"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Vos formations sont examinées par l'administrateur avant publication.
        </p>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle formation</Button>
      </div>

      <div className="grid gap-3">
        {(formations ?? []).map((f: any) => (
          <Card key={f.id} className="p-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{f.title}</div>
              <div className="text-xs text-muted-foreground truncate">{f.description}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Badge className={STATUS_COLORS[f.status] ?? ""}>{f.status}</Badge>
                <span className="text-muted-foreground">{f.price ? `${f.price} Ar` : "Gratuit"}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouvelle"} formation</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Titre *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prix (Ar)</Label>
                  <Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                </div>
                <div>
                  <Label>Niveau</Label>
                  <Input value={editing.level ?? ""} onChange={(e) => setEditing({ ...editing, level: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>URL de couverture (image)</Label>
                <Input placeholder="https://..." value={editing.cover_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} />
              </div>
              <div>
                <Label>URL YouTube (bande-annonce)</Label>
                <Input placeholder="https://youtube.com/..." value={editing.youtube_url ?? ""} onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })} />
              </div>
              <Button onClick={save} className="w-full">Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
