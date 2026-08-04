import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { KeyRound, Trash2, Copy, RefreshCw } from "lucide-react";

const randomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export function AccessCodesTab() {
  const qc = useQueryClient();
  const [code, setCode] = useState(randomCode());
  const [moduleId, setModuleId] = useState("");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("1");

  const { data: modules } = useQuery({
    queryKey: ["codes-modules"],
    queryFn: async () =>
      (await supabase
        .from("modules")
        .select("id,title,display_order,formations(title)")
        .order("display_order")).data ?? [],
  });

  const { data: codes } = useQuery({
    queryKey: ["access-codes"],
    queryFn: async () =>
      (await supabase
        .from("access_codes")
        .select("*, modules(title, formations(title))")
        .order("created_at", { ascending: false })).data ?? [],
  });

  const create = async () => {
    if (!moduleId) return toast.error("Choisissez un module");
    if (code.trim().length < 3) return toast.error("Code trop court");
    const { error } = await supabase.from("access_codes").insert({
      code: code.trim().toUpperCase(),
      module_id: moduleId,
      label: label.trim() || null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      max_uses: maxUses ? Number(maxUses) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Code créé");
    setCode(randomCode());
    setLabel("");
    qc.invalidateQueries({ queryKey: ["access-codes"] });
  };

  const toggle = async (c: any) => {
    const { error } = await supabase.from("access_codes").update({ is_active: !c.is_active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["access-codes"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce code ?")) return;
    const { error } = await supabase.from("access_codes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["access-codes"] });
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardContent className="py-4 space-y-3">
          <p className="font-semibold flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Nouveau code d'accès</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                <Button size="icon" variant="outline" onClick={() => setCode(randomCode())}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Module concerné</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger><SelectValue placeholder="Choisir un module…" /></SelectTrigger>
                <SelectContent>
                  {(modules ?? []).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.formations?.title} — M{m.display_order} {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Libellé (optionnel)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Promo lycée…" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Expiration</Label>
                <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              <div>
                <Label>Utilisations max</Label>
                <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="illimité" />
              </div>
            </div>
          </div>
          <Button onClick={create}>Créer le code</Button>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {(codes ?? []).map((c: any) => {
          const expired = c.expires_at && new Date(c.expires_at) < new Date();
          const exhausted = c.max_uses != null && c.uses_count >= c.max_uses;
          return (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <code className="font-mono font-bold">{c.code}</code>
                <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copié"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{c.modules?.formations?.title} — {c.modules?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.label ? `${c.label} • ` : ""}
                    {c.uses_count}/{c.max_uses ?? "∞"} utilisation(s)
                    {c.expires_at ? ` • expire le ${new Date(c.expires_at).toLocaleString()}` : " • sans expiration"}
                  </p>
                </div>
                {expired && <Badge variant="destructive">Expiré</Badge>}
                {exhausted && <Badge variant="destructive">Épuisé</Badge>}
                <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Actif" : "Désactivé"}</Badge>
                <Button size="sm" variant="outline" onClick={() => toggle(c)}>
                  {c.is_active ? "Désactiver" : "Activer"}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {(codes ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun code d'accès.</p>}
      </div>
    </div>
  );
}
