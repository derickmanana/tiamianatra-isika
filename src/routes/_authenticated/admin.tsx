import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { reviewPayment, toggleUserBlock, broadcastMessage } from "@/lib/admin.functions";
import { CoverUploader } from "@/components/CoverUploader";
import { syncPlaylist, saveYoutubeApiKey, getYoutubeApiKeyMasked } from "@/lib/playlist.functions";
import { CourseStructureTab } from "@/components/admin/CourseStructureTab";
import { AccessCodesTab } from "@/components/admin/AccessCodesTab";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin, loading } = useAuth();
  const { data: pendingPartnersCount = 0 } = useQuery({
    queryKey: ["admin-partners-pending-count"],
    enabled: isAdmin,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count } = await supabase
        .from("partners")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });
  if (loading) return <ClientLayout><p className="text-muted-foreground">…</p></ClientLayout>;
  if (!isAdmin) return <ClientLayout><p className="text-destructive">Accès refusé</p></ClientLayout>;

  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("admin.dashboard")}</h1>
      {pendingPartnersCount > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-primary/50 bg-primary/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <b>{pendingPartnersCount}</b> nouvelle{pendingPartnersCount > 1 ? "s" : ""} demande{pendingPartnersCount > 1 ? "s" : ""} d'inscription (Formateur / Recruteur) en attente de validation.
          </div>
          <Badge>Onglet Partenaires</Badge>
        </div>
      )}
      <Tabs defaultValue={pendingPartnersCount > 0 ? "partners" : "dashboard"}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">{t("admin.dashboard")}</TabsTrigger>
          <TabsTrigger value="payments">{t("admin.payments_mgmt")}</TabsTrigger>
          <TabsTrigger value="formations">Formations</TabsTrigger>
          <TabsTrigger value="modules">{t("admin.modules_mgmt")}</TabsTrigger>
          <TabsTrigger value="structure">Contenu (Dossiers / Blocs / Leçons)</TabsTrigger>
          <TabsTrigger value="codes">Codes d'accès</TabsTrigger>
          <TabsTrigger value="hero">Slider accueil</TabsTrigger>
          <TabsTrigger value="schools">Écoles</TabsTrigger>
          <TabsTrigger value="tracks">Types apprentissage</TabsTrigger>
          <TabsTrigger value="durations">Durées</TabsTrigger>
          <TabsTrigger value="users">{t("admin.users_mgmt")}</TabsTrigger>
          <TabsTrigger value="announcements">{t("admin.announcements_mgmt")}</TabsTrigger>
          <TabsTrigger value="messages">{t("admin.messages_mgmt")}</TabsTrigger>
          <TabsTrigger value="settings">{t("admin.payment_settings")}</TabsTrigger>
          <TabsTrigger value="api">Paramètres API</TabsTrigger>
          <TabsTrigger value="email">Paramètres Email</TabsTrigger>
          <TabsTrigger value="partners">
            Partenaires
            {pendingPartnersCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {pendingPartnersCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="formations"><FormationsAdminTab /></TabsContent>
        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="structure"><CourseStructureTab /></TabsContent>
        <TabsContent value="codes"><AccessCodesTab /></TabsContent>
        <TabsContent value="hero"><HeroSlidesTab /></TabsContent>
        <TabsContent value="schools"><SchoolsTab /></TabsContent>
        <TabsContent value="tracks"><TracksTab /></TabsContent>
        <TabsContent value="durations"><DurationsTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="messages"><MessagesTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
        <TabsContent value="api"><ApiSettingsTab /></TabsContent>
        <TabsContent value="email"><EmailSettingsTab /></TabsContent>
        <TabsContent value="partners"><PartnersAdminTab /></TabsContent>
      </Tabs>
    </ClientLayout>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card><CardContent className="py-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold text-primary">{value}</p></CardContent></Card>
  );
}

function DashboardTab() {
  const { t } = useTranslation();
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, formations, modules, videos, pending, validated] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("formations").select("id", { count: "exact", head: true }),
        supabase.from("modules").select("id", { count: "exact", head: true }),
        supabase.from("videos").select("id", { count: "exact", head: true }),
        supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payments").select("amount_ariary").eq("status", "validated"),
      ]);
      const revenue = (validated.data ?? []).reduce((s, p) => s + (p.amount_ariary ?? 0), 0);
      return {
        users: users.count ?? 0, formations: formations.count ?? 0, modules: modules.count ?? 0,
        videos: videos.count ?? 0, pending: pending.count ?? 0,
        validated: validated.data?.length ?? 0, revenue,
      };
    },
  });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      <Stat label={t("admin.total_users")} value={stats?.users ?? 0} />
      <Stat label={t("admin.total_formations")} value={stats?.formations ?? 0} />
      <Stat label={t("admin.total_modules")} value={stats?.modules ?? 0} />
      <Stat label={t("admin.total_videos")} value={stats?.videos ?? 0} />
      <Stat label={t("admin.pending_payments")} value={stats?.pending ?? 0} />
      <Stat label={t("admin.validated_payments")} value={stats?.validated ?? 0} />
      <Card className="col-span-2"><CardContent className="py-4"><p className="text-xs text-muted-foreground">{t("admin.total_revenue")}</p><p className="text-2xl font-bold text-accent">{(stats?.revenue ?? 0).toLocaleString()} Ar</p></CardContent></Card>
    </div>
  );
}

function PaymentsTab() {
  const qc = useQueryClient();
  const review = useServerFn(reviewPayment);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data: pays, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const list = pays ?? [];
      const userIds = [...new Set(list.map((p) => p.user_id))];
      const modIds = [...new Set(list.map((p) => p.module_id))];
      const [profs, mods] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, email, full_name").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        modIds.length
          ? supabase.from("modules").select("id, title, formation_id, formations(title)").in("id", modIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const pmap = new Map((profs.data ?? []).map((p: any) => [p.id, p]));
      const mmap = new Map((mods.data ?? []).map((m: any) => [m.id, m]));
      return list.map((p) => ({
        ...p,
        profile: pmap.get(p.user_id),
        module: mmap.get(p.module_id),
      }));
    },
  });

  const openProof = async (path: string) => {
    if (!path) return toast.error("Aucune capture");
    if (/^https?:\/\//.test(path)) { setPreviewUrl(path); return; }
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
    if (data?.signedUrl) setPreviewUrl(data.signedUrl);
    else toast.error("Impossible d'afficher la capture");
  };

  const validate = async (id: string) => {
    try { await review({ data: { paymentId: id, decision: "validated" } }); toast.success("Paiement validé"); qc.invalidateQueries({ queryKey: ["admin-payments"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  const confirmReject = async () => {
    if (!rejectFor) return;
    try {
      await review({ data: { paymentId: rejectFor, decision: "rejected", comment: rejectComment } });
      toast.success("Paiement refusé");
      setRejectFor(null); setRejectComment("");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="grid gap-2 mt-4">
      {isLoading && <p className="text-muted-foreground text-sm">Chargement…</p>}
      {data?.length === 0 && <p className="text-muted-foreground text-sm">Aucun paiement.</p>}
      {data?.map((p: any) => (
        <Card key={p.id}>
          <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{p.profile?.full_name || p.profile?.email || "Utilisateur inconnu"}</p>
              <p className="text-xs text-muted-foreground">
                {p.module?.formations?.title} • {p.module?.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleString()} • {p.amount_ariary.toLocaleString()} Ar • {p.method}
              </p>
              {p.admin_comment && <p className="text-xs text-warning mt-1">Motif : {p.admin_comment}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === "validated" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{p.status}</Badge>
              <Button size="sm" variant="outline" onClick={() => openProof(p.proof_url)}>Voir capture</Button>
              {p.status === "pending" && <>
                <Button size="sm" onClick={() => validate(p.id)}>Valider</Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectFor(p.id)}>Refuser</Button>
              </>}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader><DialogTitle>Aperçu de la capture</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="Preuve de paiement" className="w-full h-auto max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser ce paiement</DialogTitle></DialogHeader>
          <Textarea placeholder="Motif du refus (visible par l'utilisateur)" value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmReject}>Confirmer le refus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModulesTab() {
  const qc = useQueryClient();
  const sync = useServerFn(syncPlaylist);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const { data: formations } = useQuery({
    queryKey: ["admin-formations"],
    queryFn: async () => (await supabase.from("formations").select("*, modules(*, playlists(youtube_url), videos(count))").order("display_order")).data ?? [],
  });

  const doSync = async (moduleId: string, existingUrl?: string) => {
    const url = urls[moduleId] ?? existingUrl ?? "";
    if (!url) return toast.error("URL requise");
    try {
      const r = await sync({ data: { moduleId, playlistUrl: url } });
      toast.success(`${r.count} vidéos importées`);
      qc.invalidateQueries({ queryKey: ["admin-formations"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const saveModule = async (id: string, patch: Partial<{ title: string; price_ariary: number }>) => {
    const { error } = await supabase.from("modules").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Module mis à jour");
    qc.invalidateQueries({ queryKey: ["admin-formations"] });
  };




  return (
    <div className="grid gap-3 mt-4">
      {formations?.map((f: any) => (
        <Card key={f.id}>
          <CardHeader>
            <CardTitle className="text-base">{f.title}</CardTitle>
            <FormationCoverEditor formation={f} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-formations"] })} />
          </CardHeader>
          <CardContent className="space-y-2">
            {f.modules?.sort((a: any, b: any) => a.display_order - b.display_order).map((m: any) => (
              <div key={m.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Module {m.display_order} • {m.videos?.[0]?.count ?? 0} vidéos</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <Label className="text-xs">Titre du module</Label>
                    <Input defaultValue={m.title} onBlur={(e) => { if (e.target.value !== m.title) saveModule(m.id, { title: e.target.value }); }} />
                  </div>
                  <div>
                    <Label className="text-xs">Prix (Ariary)</Label>
                    <Input type="number" defaultValue={m.price_ariary} onBlur={(e) => { const v = Number(e.target.value); if (v && v !== m.price_ariary) saveModule(m.id, { price_ariary: v }); }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="URL playlist YouTube"
                    defaultValue={m.playlists?.[0]?.youtube_url ?? ""}
                    onChange={(e) => setUrls((s) => ({ ...s, [m.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => doSync(m.id, m.playlists?.[0]?.youtube_url)}>Sync</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const toggle = useServerFn(toggleUserBlock);
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
      if (q) query = query.ilike("email", `%${q}%`);
      return (await query).data ?? [];
    },
  });
  return (
    <div className="mt-4 space-y-3">
      <Input placeholder="Rechercher par email…" value={q} onChange={(e) => setQ(e.target.value)} />
      {data?.map((u) => (
        <Card key={u.id}><CardContent className="py-3 flex items-center justify-between">
          <div><p className="font-medium">{u.email}</p><p className="text-xs text-muted-foreground">{u.full_name} {u.phone && `• ${u.phone}`}</p></div>
          <div className="flex items-center gap-2">
            {u.is_blocked && <Badge variant="destructive">Bloqué</Badge>}
            <Button size="sm" variant="outline" onClick={async () => { await toggle({ data: { userId: u.id, block: !u.is_blocked } }); qc.invalidateQueries({ queryKey: ["admin-users"] }); }}>
              {u.is_blocked ? "Débloquer" : "Bloquer"}
            </Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function AnnouncementsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const { data } = useQuery({ queryKey: ["admin-announcements"], queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [] });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("announcements").insert({ title, body, is_active: true });
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: ["admin-announcements"] });
  };
  const toggle = async (id: string, v: boolean) => { await supabase.from("announcements").update({ is_active: v }).eq("id", id); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); };
  const del = async (id: string) => { await supabase.from("announcements").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); };

  return (
    <div className="mt-4 space-y-3">
      <Card><CardContent className="py-4">
        <form onSubmit={add} className="space-y-2">
          <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Contenu" value={body} onChange={(e) => setBody(e.target.value)} required />
          <Button type="submit" className="bg-gradient-primary">Ajouter</Button>
        </form>
      </CardContent></Card>
      {data?.map((a) => (
        <Card key={a.id}><CardContent className="py-3 flex items-center justify-between gap-2">
          <div><p className="font-medium">{a.title}</p><p className="text-sm text-muted-foreground">{a.body}</p></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => toggle(a.id, !a.is_active)}>{a.is_active ? "Désactiver" : "Activer"}</Button><Button size="sm" variant="destructive" onClick={() => del(a.id)}>Supprimer</Button></div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function MessagesTab() {
  const send = useServerFn(broadcastMessage);
  const [subject, setSubject] = useState(""); const [body, setBody] = useState(""); const [userId, setUserId] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await send({ data: { subject, body, userId: userId || undefined } });
      toast.success("Envoyé"); setSubject(""); setBody(""); setUserId("");
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Card className="mt-4"><CardContent className="py-4">
      <form onSubmit={submit} className="space-y-2">
        <Input placeholder="ID utilisateur (vide = à tous)" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <Input placeholder="Sujet" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <Textarea placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} required rows={5} />
        <Button type="submit" className="bg-gradient-primary">Envoyer</Button>
      </form>
    </CardContent></Card>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data: methods } = useQuery({ queryKey: ["admin-methods"], queryFn: async () => (await supabase.from("payment_methods").select("*")).data ?? [] });
  const { data: settings } = useQuery({ queryKey: ["admin-settings"], queryFn: async () => {
    const { data } = await supabase.from("settings").select("*"); const map: Record<string,string> = {}; (data ?? []).forEach(r => map[r.key] = r.value); return map;
  }});

  const updateMethod = async (id: string, patch: any) => { await supabase.from("payment_methods").update(patch).eq("id", id); qc.invalidateQueries({ queryKey: ["admin-methods"] }); toast.success("OK"); };
  const updateSetting = async (key: string, value: string) => { await supabase.from("settings").update({ value }).eq("key", key); qc.invalidateQueries({ queryKey: ["admin-settings"] }); toast.success("OK"); };

  return (
    <div className="mt-4 space-y-4">
      <Card><CardHeader><CardTitle className="text-base">Taux USDT</CardTitle></CardHeader><CardContent>
        <div className="flex gap-2">
          <Input id="rate" defaultValue={settings?.usdt_rate_ariary} type="number" />
          <Button onClick={() => updateSetting("usdt_rate_ariary", (document.getElementById("rate") as HTMLInputElement).value)}>Enregistrer</Button>
        </div>
      </CardContent></Card>
      {methods?.map((m) => (
        <Card key={m.id}><CardHeader><CardTitle className="text-base capitalize">{m.method}</CardTitle></CardHeader><CardContent className="space-y-2">
          <div><Label>Numéro / UID</Label><Input defaultValue={m.account_number} onBlur={(e) => updateMethod(m.id, { account_number: e.target.value })} /></div>
          <div><Label>Titulaire</Label><Input defaultValue={m.account_holder} onBlur={(e) => updateMethod(m.id, { account_holder: e.target.value })} /></div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function ApiSettingsTab() {
  const fetchMasked = useServerFn(getYoutubeApiKeyMasked);
  const save = useServerFn(saveYoutubeApiKey);
  const [key, setKey] = useState("");
  const [info, setInfo] = useState<{ hasKey: boolean; masked: string }>({ hasKey: false, masked: "" });

  useEffect(() => { fetchMasked().then(setInfo).catch(() => {}); }, []);

  const onSave = async () => {
    try {
      await save({ data: { key } });
      toast.success("Clé YouTube enregistrée");
      setKey("");
      const i = await fetchMasked();
      setInfo(i);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Clé API YouTube Data v3</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Obtenez votre clé gratuite sur Google Cloud Console → APIs & Services → Credentials → Create API Key, puis activez « YouTube Data API v3 ».
          </p>
          {info.hasKey && <p className="text-sm">Clé actuelle : <code className="bg-muted px-1.5 py-0.5 rounded">{info.masked}</code></p>}
          <div className="flex gap-2">
            <Input type="password" placeholder="Collez votre clé YouTube API ici" value={key} onChange={(e) => setKey(e.target.value)} />
            <Button onClick={onSave} disabled={!key.trim()}>Enregistrer</Button>
          </div>
          <p className="text-xs text-muted-foreground">La clé est stockée côté serveur et utilisée automatiquement à chaque synchronisation de playlist.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function EmailSettingsTab() {
  const sender = "kraro.store.madagascar@gmail.com";
  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Adresse de réponse</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Nom expéditeur affiché : <strong>M'BossTsika</strong></p>
          <p>Adresse Reply-To : <code className="bg-muted px-1.5 py-0.5 rounded">{sender}</code></p>
          <p className="text-muted-foreground text-xs">Les réponses des utilisateurs arriveront sur cette boîte Gmail.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Domaine d'envoi</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>L'envoi d'emails professionnels (bienvenue, paiements, certificats) nécessite un domaine vérifié — Gmail ne peut pas être utilisé comme expéditeur SMTP officiel.</p>
          <p className="text-muted-foreground">Une fois le domaine configuré, les emails partiront automatiquement depuis <strong>notify.votredomaine.com</strong> au nom de <strong>M'BossTsika</strong>, avec Reply-To vers votre Gmail.</p>
          <p className="text-xs text-muted-foreground">Cette configuration se fait depuis l'interface Lovable Cloud → Emails.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Emails automatiques prévus</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <ul className="list-disc pl-5 space-y-1">
            <li>Bienvenue / confirmation d'inscription</li>
            <li>Preuve de paiement reçue</li>
            <li>Paiement validé ✅</li>
            <li>Paiement refusé ❌ (avec motif)</li>
            <li>Certificat disponible 🏆</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">Les notifications in-app pour ces événements sont déjà actives.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// FORMATION COVER EDITOR — image OR YouTube video + price/level
// ============================================================
function FormationCoverEditor({ formation, onSaved }: { formation: any; onSaved: () => void }) {
  const [coverType, setCoverType] = useState<string>(formation.cover_type ?? "image");
  const [youtubeUrl, setYoutubeUrl] = useState(formation.youtube_url ?? "");
  const [price, setPrice] = useState<number>(Number(formation.price ?? 0));
  const [level, setLevel] = useState<string>(formation.level ?? "debutant");

  const save = async (patch: any) => {
    const { error } = await supabase.from("formations").update(patch).eq("id", formation.id);
    if (error) return toast.error(error.message);
    toast.success("Formation mise à jour");
    onSaved();
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        <div>
          <Label className="text-xs">Type de couverture</Label>
          <select value={coverType} onChange={(e) => { setCoverType(e.target.value); save({ cover_type: e.target.value }); }}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="image">Image</option>
            <option value="video">Vidéo YouTube</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Niveau</Label>
          <select value={level} onChange={(e) => { setLevel(e.target.value); save({ level: e.target.value }); }}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="debutant">Débutant</option>
            <option value="intermediaire">Intermédiaire</option>
            <option value="avance">Avancé</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Prix (Ar)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
            onBlur={() => { if (price !== Number(formation.price ?? 0)) save({ price }); }} />
        </div>
      </div>

      {coverType === "image" ? (
        <div>
          <Label className="text-xs mb-1 block">Image de couverture</Label>
          <CoverUploader formation={formation} onSaved={onSaved} />
        </div>
      ) : (
        <div>
          <Label className="text-xs">URL vidéo YouTube</Label>
          <div className="flex gap-2">
            <Input placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
            <Button size="sm" onClick={() => save({ youtube_url: youtubeUrl })}>Enregistrer</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">La vidéo se jouera automatiquement en muet et en boucle sur la couverture.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HERO SLIDES TAB
// ============================================================
function HeroSlidesTab() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-hero-slides"],
    queryFn: async () => (await supabase.from("hero_slides").select("*").order("display_order")).data ?? [],
  });
  const [draft, setDraft] = useState({ type: "text", title: "", body: "", youtube_url: "", cta_label: "", cta_url: "", display_order: 0 });
  const [file, setFile] = useState<File | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    let media_url: string | null = null;
    if (draft.type === "image" && file) {
      const path = `hero/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("formation-covers").upload(path, file);
      if (upErr) return toast.error(upErr.message);
      media_url = path;
    }
    const { error } = await supabase.from("hero_slides").insert({ ...draft, media_url, is_active: true });
    if (error) return toast.error(error.message);
    toast.success("Annonce ajoutée");
    setDraft({ type: "text", title: "", body: "", youtube_url: "", cta_label: "", cta_url: "", display_order: 0 });
    setFile(null);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    qc.invalidateQueries({ queryKey: ["hero-slides"] });
  };

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("hero_slides").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    qc.invalidateQueries({ queryKey: ["hero-slides"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    await supabase.from("hero_slides").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-hero-slides"] });
    qc.invalidateQueries({ queryKey: ["hero-slides"] });
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Ajouter une annonce</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs">Type</Label>
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="text">Texte</option>
                  <option value="image">Image</option>
                  <option value="video">Vidéo YouTube</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Ordre</Label>
                <Input type="number" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })} />
              </div>
            </div>
            <Input placeholder="Titre" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <Textarea placeholder="Description" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            {draft.type === "image" && <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
            {draft.type === "video" && <Input placeholder="URL YouTube" value={draft.youtube_url} onChange={(e) => setDraft({ ...draft, youtube_url: e.target.value })} />}
            <div className="grid gap-2 md:grid-cols-2">
              <Input placeholder="Libellé bouton (optionnel)" value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
              <Input placeholder="Lien bouton (optionnel)" value={draft.cta_url} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} />
            </div>
            <Button type="submit" className="bg-gradient-primary">Ajouter l'annonce</Button>
          </form>
        </CardContent>
      </Card>
      {data?.map((s: any) => (
        <Card key={s.id}>
          <CardContent className="py-3 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{s.title || <em className="text-muted-foreground">(sans titre)</em>}</p>
              <p className="text-xs text-muted-foreground">Type: {s.type} • Ordre: {s.display_order}</p>
              {s.body && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{s.body}</p>}
            </div>
            <div className="flex gap-2">
              <Input type="number" defaultValue={s.display_order} className="w-20" onBlur={(e) => update(s.id, { display_order: Number(e.target.value) })} />
              <Button size="sm" variant="outline" onClick={() => update(s.id, { is_active: !s.is_active })}>{s.is_active ? "Désactiver" : "Activer"}</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>Supprimer</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// SCHOOLS TAB
// ============================================================
function SchoolsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-schools"], queryFn: async () => (await supabase.from("schools").select("*").order("display_order")).data ?? [] });
  const [draft, setDraft] = useState({ name: "", description: "", country: "", logo_url: "", display_order: 0 });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("schools").insert({ ...draft, is_active: true });
    if (error) return toast.error(error.message);
    setDraft({ name: "", description: "", country: "", logo_url: "", display_order: 0 });
    qc.invalidateQueries({ queryKey: ["admin-schools"] });
    qc.invalidateQueries({ queryKey: ["schools"] });
    toast.success("École ajoutée");
  };
  const update = async (id: string, patch: any) => {
    await supabase.from("schools").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-schools"] });
    qc.invalidateQueries({ queryKey: ["schools"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("schools").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-schools"] });
    qc.invalidateQueries({ queryKey: ["schools"] });
  };
  return (
    <div className="mt-4 space-y-3">
      <Card><CardContent className="py-4">
        <form onSubmit={add} className="space-y-2">
          <Input placeholder="Nom de l'école" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Pays" value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} />
            <Input type="url" placeholder="URL du logo (optionnel)" value={draft.logo_url} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} />
          </div>
          <Textarea placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <Button type="submit" className="bg-gradient-primary">Ajouter</Button>
        </form>
      </CardContent></Card>
      {data?.map((s: any) => (
        <Card key={s.id}><CardContent className="py-3 flex items-center gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {s.logo_url ? <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-lg object-cover" /> : <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center text-white font-bold">{s.name[0]}</div>}
            <div className="min-w-0">
              <Input defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && update(s.id, { name: e.target.value })} className="font-medium" />
              <p className="text-xs text-muted-foreground mt-1">{s.country} {!s.is_active && "• Inactive"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => update(s.id, { is_active: !s.is_active })}>{s.is_active ? "Désactiver" : "Activer"}</Button>
            <Button size="sm" variant="destructive" onClick={() => remove(s.id)}>Supprimer</Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

// ============================================================
// TRACKS TAB
// ============================================================
function TracksTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-tracks"], queryFn: async () => (await supabase.from("learning_tracks").select("*").order("display_order")).data ?? [] });
  const [draft, setDraft] = useState({ code: "", label: "", description: "", price_multiplier: 1, display_order: 0 });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("learning_tracks").insert({ ...draft, is_active: true });
    if (error) return toast.error(error.message);
    setDraft({ code: "", label: "", description: "", price_multiplier: 1, display_order: 0 });
    qc.invalidateQueries({ queryKey: ["admin-tracks"] });
    qc.invalidateQueries({ queryKey: ["tracks"] });
    toast.success("Ajouté");
  };
  const update = async (id: string, patch: any) => {
    await supabase.from("learning_tracks").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-tracks"] });
    qc.invalidateQueries({ queryKey: ["tracks"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("learning_tracks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-tracks"] });
    qc.invalidateQueries({ queryKey: ["tracks"] });
  };
  return (
    <div className="mt-4 space-y-3">
      <Card><CardContent className="py-4">
        <form onSubmit={add} className="space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <Input placeholder="Code (ex: certificat)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} required />
            <Input placeholder="Libellé affiché" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} required />
          </div>
          <Textarea placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="grid gap-2 md:grid-cols-2">
            <Input type="number" step="0.1" placeholder="Multiplicateur prix" value={draft.price_multiplier} onChange={(e) => setDraft({ ...draft, price_multiplier: Number(e.target.value) })} />
            <Input type="number" placeholder="Ordre" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })} />
          </div>
          <Button type="submit" className="bg-gradient-primary">Ajouter</Button>
        </form>
      </CardContent></Card>
      {data?.map((tr: any) => (
        <Card key={tr.id}><CardContent className="py-3 flex items-center gap-3 justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium">{tr.label} <span className="text-xs text-muted-foreground">({tr.code})</span></p>
            <p className="text-xs text-muted-foreground">{tr.description} • ×{tr.price_multiplier}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => update(tr.id, { is_active: !tr.is_active })}>{tr.is_active ? "Désactiver" : "Activer"}</Button>
            <Button size="sm" variant="destructive" onClick={() => remove(tr.id)}>Supprimer</Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

// ============================================================
// DURATIONS TAB
// ============================================================
function DurationsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-durations"], queryFn: async () => (await supabase.from("course_durations").select("*").order("display_order")).data ?? [] });
  const [draft, setDraft] = useState({ name: "", description: "", duration_weeks: 12, price_multiplier: 1, display_order: 0 });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("course_durations").insert({ ...draft, is_active: true });
    if (error) return toast.error(error.message);
    setDraft({ name: "", description: "", duration_weeks: 12, price_multiplier: 1, display_order: 0 });
    qc.invalidateQueries({ queryKey: ["admin-durations"] });
    qc.invalidateQueries({ queryKey: ["durations"] });
    toast.success("Ajouté");
  };
  const update = async (id: string, patch: any) => {
    await supabase.from("course_durations").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-durations"] });
    qc.invalidateQueries({ queryKey: ["durations"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
    await supabase.from("course_durations").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-durations"] });
    qc.invalidateQueries({ queryKey: ["durations"] });
  };
  return (
    <div className="mt-4 space-y-3">
      <Card><CardContent className="py-4">
        <form onSubmit={add} className="space-y-2">
          <Input placeholder="Nom (ex: Cours du Soir)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          <Textarea placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <div className="grid gap-2 md:grid-cols-3">
            <Input type="number" placeholder="Semaines" value={draft.duration_weeks} onChange={(e) => setDraft({ ...draft, duration_weeks: Number(e.target.value) })} />
            <Input type="number" step="0.1" placeholder="Multiplicateur" value={draft.price_multiplier} onChange={(e) => setDraft({ ...draft, price_multiplier: Number(e.target.value) })} />
            <Input type="number" placeholder="Ordre" value={draft.display_order} onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })} />
          </div>
          <Button type="submit" className="bg-gradient-primary">Ajouter</Button>
        </form>
      </CardContent></Card>
      {data?.map((d: any) => (
        <Card key={d.id}><CardContent className="py-3 flex items-center gap-3 justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium">{d.name}</p>
            <p className="text-xs text-muted-foreground">{d.description} • {d.duration_weeks} sem. • ×{d.price_multiplier}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => update(d.id, { is_active: !d.is_active })}>{d.is_active ? "Désactiver" : "Activer"}</Button>
            <Button size="sm" variant="destructive" onClick={() => remove(d.id)}>Supprimer</Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

// ============================================================
// FORMATIONS CRUD TAB
// ============================================================
function FormationsAdminTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const { data: list } = useQuery({
    queryKey: ["admin-formations-list"],
    queryFn: async () =>
      (await supabase.from("formations").select("*, modules(count)").order("display_order")).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-formations-list"] });
    qc.invalidateQueries({ queryKey: ["admin-formations"] });
    qc.invalidateQueries({ queryKey: ["home-formations"] });
    qc.invalidateQueries({ queryKey: ["formations"] });
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Titre requis");
    const nextOrder = (list?.length ?? 0) + 1;
    const { error } = await supabase.from("formations").insert({
      title: title.trim(),
      description: description.trim() || null,
      display_order: nextOrder,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Formation créée");
    setTitle(""); setDescription("");
    refresh();
  };

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("formations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("formations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Formation supprimée");
    setConfirmDel(null);
    refresh();
  };

  const move = async (id: string, dir: -1 | 1) => {
    if (!list) return;
    const idx = list.findIndex((f: any) => f.id === id);
    const swap = list[idx + dir];
    if (!swap) return;
    const a = list[idx];
    await Promise.all([
      supabase.from("formations").update({ display_order: swap.display_order }).eq("id", a.id),
      supabase.from("formations").update({ display_order: a.display_order }).eq("id", swap.id),
    ]);
    refresh();
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">➕ Ajouter une formation</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-2">
            <Input placeholder="Nom de la formation" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            <Button type="submit" className="bg-gradient-primary">Créer</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {list?.map((f: any, i: number) => (
          <Card key={f.id}>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">#{f.display_order}</span>
                    <Input
                      defaultValue={f.title}
                      onBlur={(e) => { if (e.target.value !== f.title) update(f.id, { title: e.target.value }); }}
                      className="font-medium"
                    />
                  </div>
                  <Textarea
                    defaultValue={f.description ?? ""}
                    placeholder="Description"
                    rows={2}
                    className="mt-2"
                    onBlur={(e) => { if (e.target.value !== (f.description ?? "")) update(f.id, { description: e.target.value || null }); }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {f.modules?.[0]?.count ?? 0} modules • Prix: {Number(f.price ?? 0).toLocaleString()} Ar • Niveau: {f.level ?? "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="outline" disabled={i === 0} onClick={() => move(f.id, -1)}>↑</Button>
                  <Button size="sm" variant="outline" disabled={i === (list.length - 1)} onClick={() => move(f.id, 1)}>↓</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant={f.is_active ? "default" : "secondary"}>
                  {f.is_active ? "Active" : "Désactivée"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => update(f.id, { is_active: !f.is_active })}>
                  {f.is_active ? "Désactiver" : "Activer"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setConfirmDel(f.id)}>Supprimer</Button>
              </div>
              <FormationCoverEditor formation={f} onSaved={refresh} />
            </CardContent>
          </Card>
        ))}
        {list?.length === 0 && <p className="text-sm text-muted-foreground">Aucune formation. Créez-en une ci-dessus.</p>}
      </div>

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cette formation ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Tous les modules, vidéos et paiements liés seront également supprimés.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => confirmDel && remove(confirmDel)}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartnersAdminTab() {
  const qc = useQueryClient();
  const { data: partners } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => (await supabase.from("partners").select("*, profiles:user_id(full_name, email)").order("created_at", { ascending: false })).data ?? [],
    refetchInterval: 15000,
  });
  const { data: pendingForms } = useQuery({
    queryKey: ["admin-pending-formations"],
    queryFn: async () => (await supabase.from("formations").select("id, title, status, owner_partner_id").eq("status", "pending")).data ?? [],
  });
  const { data: pendingJobs } = useQuery({
    queryKey: ["admin-pending-jobs"],
    queryFn: async () => (await supabase.from("job_offers").select("id, title, status, partner_id").eq("status", "pending")).data ?? [],
  });

  const setStatus = async (table: "partners" | "formations" | "job_offers", id: string, status: string) => {
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mis à jour");
    qc.invalidateQueries();
  };

  const all = partners ?? [];
  const pendingFormateurs = all.filter((p: any) => p.partner_type === "formateur" && p.status === "pending");
  const pendingRecruteurs = all.filter((p: any) => p.partner_type === "recruteur" && p.status === "pending");
  const otherPartners = all.filter((p: any) => p.status !== "pending");

  const renderPartner = (p: any) => (
    <div key={p.id} className="p-3 border rounded-lg flex items-center justify-between gap-2 flex-wrap bg-card">
      <div className="min-w-0">
        <div className="font-semibold flex items-center gap-2 flex-wrap">
          {p.display_name}
          <Badge variant={p.partner_type === "formateur" ? "default" : "secondary"}>
            {p.partner_type === "formateur" ? "Formateur" : "Recruteur"}
          </Badge>
          <Badge variant={p.status === "approved" ? "default" : p.status === "pending" ? "outline" : "destructive"}>
            {p.status}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {p.profiles?.full_name ? `${p.profiles.full_name} · ` : ""}{p.profiles?.email} {p.company ? `· ${p.company}` : ""}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
        {p.bio && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.bio}</div>}

      </div>
      <div className="flex gap-1 flex-wrap">
        <Button size="sm" onClick={() => setStatus("partners", p.id, "approved")}>Approuver</Button>
        <Button size="sm" variant="outline" onClick={() => setStatus("partners", p.id, "rejected")}>Refuser</Button>
        <Button size="sm" variant="outline" onClick={() => setStatus("partners", p.id, "suspended")}>Suspendre</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-primary/40">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Demandes Formateur en attente</p>
              <p className="text-3xl font-bold text-primary">{pendingFormateurs.length}</p>
            </div>
            <Badge variant={pendingFormateurs.length > 0 ? "default" : "outline"}>
              {pendingFormateurs.length > 0 ? "Action requise" : "À jour"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Demandes Recruteur en attente</p>
              <p className="text-3xl font-bold text-primary">{pendingRecruteurs.length}</p>
            </div>
            <Badge variant={pendingRecruteurs.length > 0 ? "default" : "outline"}>
              {pendingRecruteurs.length > 0 ? "Action requise" : "À jour"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎓 Demandes Formateurs
            {pendingFormateurs.length > 0 && <Badge>{pendingFormateurs.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingFormateurs.map(renderPartner)}
          {pendingFormateurs.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande Formateur en attente.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💼 Demandes Recruteurs
            {pendingRecruteurs.length > 0 && <Badge>{pendingRecruteurs.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingRecruteurs.map(renderPartner)}
          {pendingRecruteurs.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande Recruteur en attente.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Partenaires traités</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {otherPartners.map(renderPartner)}
          {otherPartners.length === 0 && <p className="text-sm text-muted-foreground">Aucun partenaire traité.</p>}
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle>Formations en attente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(pendingForms ?? []).map((f: any) => (
            <div key={f.id} className="p-3 border rounded flex items-center justify-between gap-2">
              <div className="font-medium truncate">{f.title}</div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setStatus("formations", f.id, "approved")}>Approuver</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus("formations", f.id, "rejected")}>Refuser</Button>
              </div>
            </div>
          ))}
          {(!pendingForms || pendingForms.length === 0) && <p className="text-sm text-muted-foreground">Aucune formation en attente.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Offres d'emploi en attente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(pendingJobs ?? []).map((j: any) => (
            <div key={j.id} className="p-3 border rounded flex items-center justify-between gap-2">
              <div className="font-medium truncate">{j.title}</div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setStatus("job_offers", j.id, "approved")}>Approuver</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus("job_offers", j.id, "rejected")}>Refuser</Button>
              </div>
            </div>
          ))}
          {(!pendingJobs || pendingJobs.length === 0) && <p className="text-sm text-muted-foreground">Aucune offre en attente.</p>}
        </CardContent>
      </Card>
    </div>
  );
}


