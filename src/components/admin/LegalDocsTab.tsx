import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Save, Plus, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LEGAL_SETTING_KEYS } from "@/lib/legal";

type Doc = {
  id: string;
  slug: string;
  title: string;
  version: string;
  content: string;
  summary: string | null;
  last_updated: string;
  is_published: boolean;
  display_order: number;
};

function LegalSettingsCard() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin-legal-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", LEGAL_SETTING_KEYS.map((k) => k.key));
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value as string])) as Record<string, string>;
    },
  });

  const values = draft ?? data ?? {};

  const save = async () => {
    setSaving(true);
    const rows = LEGAL_SETTING_KEYS.map((k) => ({ key: k.key, value: values[k.key] ?? "" }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Informations légales enregistrées.");
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["admin-legal-settings"] });
    qc.invalidateQueries({ queryKey: ["legal-settings"] });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" /> Informations légales de l'entreprise
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ces valeurs remplacent automatiquement les champs {"{{"}token{"}}"} dans les documents (mentions légales,
          contact…). Les champs vides s'affichent comme « à compléter ».
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {LEGAL_SETTING_KEYS.map((k) => (
            <div key={k.key}>
              <Label className="text-xs">{k.label}</Label>
              <Input
                value={values[k.key] ?? ""}
                onChange={(e) => setDraft({ ...values, [k.key]: e.target.value })}
                placeholder="Non renseigné"
              />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving} className="bg-gradient-primary gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "…" : "Enregistrer"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DocEditor({ doc, onSaved }: { doc: Doc; onSaved: () => void }) {
  const [title, setTitle] = useState(doc.title);
  const [version, setVersion] = useState(doc.version);
  const [summary, setSummary] = useState(doc.summary ?? "");
  const [lastUpdated, setLastUpdated] = useState(doc.last_updated);
  const [content, setContent] = useState(doc.content);
  const [saving, setSaving] = useState(false);

  const save = async (publish?: boolean) => {
    if (!title.trim() || content.trim().length < 50) {
      return toast.error("Le titre est requis et le contenu doit contenir au moins 50 caractères.");
    }
    if (!version.trim()) return toast.error("Le numéro de version est requis.");
    setSaving(true);
    const { error } = await supabase
      .from("legal_documents")
      .update({
        title: title.trim(),
        version: version.trim(),
        summary: summary.trim() || null,
        last_updated: lastUpdated,
        content,
        ...(publish === undefined ? {} : { is_published: publish }),
      })
      .eq("id", doc.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(publish === false ? "Version dépubliée." : "Document enregistré.");
    onSaved();
  };

  const createNewVersion = async () => {
    const next = window.prompt("Numéro de la nouvelle version", incrementVersion(version));
    if (!next?.trim()) return;
    if (content.trim().length < 50) return toast.error("Contenu trop court pour publier une nouvelle version.");
    setSaving(true);
    // La nouvelle version devient la seule publiée pour ce document
    const { error: unpubErr } = await supabase
      .from("legal_documents")
      .update({ is_published: false })
      .eq("slug", doc.slug);
    if (unpubErr) {
      setSaving(false);
      return toast.error(unpubErr.message);
    }
    const { error } = await supabase.from("legal_documents").insert({
      slug: doc.slug,
      title: title.trim(),
      version: next.trim(),
      summary: summary.trim() || null,
      content,
      last_updated: new Date().toISOString().slice(0, 10),
      is_published: true,
      display_order: doc.display_order,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Version ${next.trim()} publiée.`);
    onSaved();
  };

  return (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Label className="text-xs">Titre</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Version</Label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Dernière mise à jour</Label>
          <Input type="date" value={lastUpdated} onChange={(e) => setLastUpdated(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Résumé (optionnel)</Label>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Contenu (markdown simple : ## titres, - listes, **gras**, {"{{"}token{"}}"})</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="font-mono text-xs" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save()} disabled={saving} className="gap-1.5 bg-gradient-primary">
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
        {doc.is_published ? (
          <Button size="sm" variant="outline" onClick={() => save(false)} disabled={saving} className="gap-1.5">
            <EyeOff className="h-4 w-4" /> Dépublier
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => save(true)} disabled={saving} className="gap-1.5">
            <Eye className="h-4 w-4" /> Publier
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={createNewVersion} disabled={saving} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nouvelle version
        </Button>
        <Link to="/legal/$slug" params={{ slug: doc.slug }} target="_blank">
          <Button size="sm" variant="ghost">Aperçu public</Button>
        </Link>
      </div>
    </div>
  );
}

function incrementVersion(v: string) {
  const m = v.match(/^(\d+)\.(\d+)$/);
  if (!m) return v + ".1";
  return `${m[1]}.${Number(m[2]) + 1}`;
}

export function LegalDocsTab() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["admin-legal-docs"],
    queryFn: async (): Promise<Doc[]> => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("id, slug, title, version, content, summary, last_updated, is_published, display_order")
        .order("display_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doc[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-legal-docs"] });
    qc.invalidateQueries({ queryKey: ["legal-docs-published"] });
  };

  return (
    <div className="space-y-4">
      <LegalSettingsCard />

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Documents juridiques</CardTitle>
          <p className="text-xs text-muted-foreground">
            Chaque version est conservée : « Nouvelle version » crée un historique et publie la dernière.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {(docs ?? []).map((d) => (
            <div key={d.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                    {d.title}
                    <Badge variant="secondary" className="text-[10px]">v{d.version}</Badge>
                    {d.is_published ? (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Publié</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Brouillon / archive</Badge>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    /{d.slug} · maj {new Date(d.last_updated).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenId(openId === d.id ? null : d.id)}>
                  {openId === d.id ? "Fermer" : "Modifier"}
                </Button>
              </div>
              {openId === d.id && <DocEditor doc={d} onSaved={refresh} />}
            </div>
          ))}
          {!isLoading && !docs?.length && <p className="text-sm text-muted-foreground italic">Aucun document.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
