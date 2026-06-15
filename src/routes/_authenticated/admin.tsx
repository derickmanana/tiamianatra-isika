import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { reviewPayment, toggleUserBlock, broadcastMessage } from "@/lib/admin.functions";
import { syncPlaylist } from "@/lib/playlist.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { t } = useTranslation();
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <ClientLayout><p className="text-muted-foreground">…</p></ClientLayout>;
  if (!isAdmin) return <ClientLayout><p className="text-destructive">Accès refusé</p></ClientLayout>;

  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("admin.dashboard")}</h1>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">{t("admin.dashboard")}</TabsTrigger>
          <TabsTrigger value="payments">{t("admin.payments_mgmt")}</TabsTrigger>
          <TabsTrigger value="modules">{t("admin.modules_mgmt")}</TabsTrigger>
          <TabsTrigger value="users">{t("admin.users_mgmt")}</TabsTrigger>
          <TabsTrigger value="announcements">{t("admin.announcements_mgmt")}</TabsTrigger>
          <TabsTrigger value="messages">{t("admin.messages_mgmt")}</TabsTrigger>
          <TabsTrigger value="settings">{t("admin.payment_settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="payments"><PaymentsTab /></TabsContent>
        <TabsContent value="modules"><ModulesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
        <TabsContent value="messages"><MessagesTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
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
  const { data } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => (await supabase.from("payments").select("*, profiles(email, full_name), modules(title)").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  const act = async (id: string, decision: "validated" | "rejected") => {
    const comment = decision === "rejected" ? prompt("Motif (optionnel) :") ?? "" : "";
    try {
      await review({ data: { paymentId: id, decision, comment } });
      toast.success("OK");
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const viewProof = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="grid gap-2 mt-4">
      {data?.map((p: any) => (
        <Card key={p.id}>
          <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm">{p.profiles?.email} — {p.modules?.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()} • {p.amount_ariary.toLocaleString()} Ar • {p.method}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === "validated" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>{p.status}</Badge>
              <Button size="sm" variant="outline" onClick={() => viewProof(p.proof_url)}>Voir preuve</Button>
              {p.status === "pending" && <>
                <Button size="sm" onClick={() => act(p.id, "validated")}>Valider</Button>
                <Button size="sm" variant="destructive" onClick={() => act(p.id, "rejected")}>Refuser</Button>
              </>}
            </div>
          </CardContent>
        </Card>
      ))}
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

  const doSync = async (moduleId: string) => {
    const url = urls[moduleId];
    if (!url) return toast.error("URL requise");
    try {
      const r = await sync({ data: { moduleId, playlistUrl: url } });
      toast.success(`${r.count} vidéos importées`);
      qc.invalidateQueries({ queryKey: ["admin-formations"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="grid gap-3 mt-4">
      {formations?.map((f: any) => (
        <Card key={f.id}>
          <CardHeader><CardTitle className="text-base">{f.title}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {f.modules?.sort((a: any, b: any) => a.display_order - b.display_order).map((m: any) => (
              <div key={m.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Module {m.display_order} — {m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.videos?.[0]?.count ?? 0} vidéos</p>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="URL playlist YouTube"
                    defaultValue={m.playlists?.[0]?.youtube_url ?? ""}
                    onChange={(e) => setUrls((s) => ({ ...s, [m.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => doSync(m.id)}>Sync</Button>
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
