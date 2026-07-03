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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Lock, Trash2, Edit } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/modules")({
  component: PartnerModules,
  validateSearch: (s: Record<string, unknown>) => ({ formation: (s.formation as string) || "" }),
});

function PartnerModules() {
  const { partner } = usePartner();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>(search.formation ?? "");
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const { data: formations } = useQuery({
    queryKey: ["partner-formations-min", partner?.id],
    enabled: !!partner,
    queryFn: async () => (await supabase
      .from("formations")
      .select("id,title,status")
      .eq("owner_partner_id", partner!.id)
      .order("created_at", { ascending: false })).data ?? [],
  });

  const formationId = selected || formations?.[0]?.id || "";

  const { data: modules } = useQuery({
    queryKey: ["partner-modules", formationId],
    enabled: !!formationId,
    queryFn: async () => (await supabase
      .from("modules")
      .select("*")
      .eq("formation_id", formationId)
      .order("display_order")).data ?? [],
  });

  const openNew = () => {
    const nextOrder = (modules?.length ?? 0) + 1;
    setEditing({ title: "", description: "", price_ariary: 0, display_order: Math.max(nextOrder, 2), is_available: true });
    setOpen(true);
  };

  const save = async () => {
    if (!editing?.title?.trim()) return toast.error("Titre requis");
    const payload: any = {
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      price_ariary: Number(editing.price_ariary) || 0,
      display_order: Number(editing.display_order) || 2,
      is_available: !!editing.is_available,
    };
    if (editing.id) {
      const { error } = await supabase.from("modules").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("modules").insert({ ...payload, formation_id: formationId });
      if (error) return toast.error(error.message);
    }
    toast.success("Enregistré");
    setOpen(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["partner-modules"] });
  };

  const remove = async (m: any) => {
    if (m.is_free_intro || m.display_order === 1) {
      toast.error("Le Module 1 gratuit ne peut pas être supprimé.");
      return;
    }
    if (!confirm("Supprimer ce module ?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    qc.invalidateQueries({ queryKey: ["partner-modules"] });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Label className="text-sm">Formation :</Label>
        <Select value={formationId} onValueChange={setSelected}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Choisir…" /></SelectTrigger>
          <SelectContent>
            {(formations ?? []).map((f: any) => (
              <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={openNew} disabled={!formationId} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nouveau module
        </Button>
      </div>

      {!formationId && (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          Créez d'abord une formation pour gérer ses modules.
        </div>
      )}

      <div className="grid gap-2">
        {(modules ?? []).map((m: any) => {
          const isFree = m.is_free_intro || m.display_order === 1;
          return (
            <Card key={m.id} className="p-3 flex items-center gap-3 flex-wrap">
              <div className="text-sm font-mono w-8 text-center">#{m.display_order}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate flex items-center gap-2">
                  {m.title}
                  {isFree && <Badge className="bg-green-500/20 text-green-700 dark:text-green-300"><Lock className="h-3 w-3 mr-1" />Gratuit protégé</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{m.description}</div>
              </div>
              <div className="text-sm font-medium">
                {isFree ? "Gratuit" : `${(m.price_ariary ?? 0).toLocaleString()} Ar`}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(m)} disabled={isFree}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier" : "Nouveau"} module</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {(editing.is_free_intro || editing.display_order === 1) && (
                <div className="p-3 rounded-md bg-yellow-500/10 text-xs">
                  Ce module est le <b>Module 1 gratuit</b>. Vous pouvez modifier le titre et la description, mais pas le prix ni l'ordre.
                </div>
              )}
              <div>
                <Label>Titre *</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Ordre</Label>
                  <Input type="number" value={editing.display_order}
                    disabled={editing.is_free_intro || editing.display_order === 1}
                    onChange={(e) => setEditing({ ...editing, display_order: e.target.value })} />
                </div>
                <div>
                  <Label>Prix (Ar)</Label>
                  <Input type="number" value={editing.price_ariary}
                    disabled={editing.is_free_intro || editing.display_order === 1}
                    onChange={(e) => setEditing({ ...editing, price_ariary: e.target.value })} />
                </div>
              </div>
              <Button onClick={save} className="w-full">Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
