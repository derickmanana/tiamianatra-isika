import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sparkles, LogIn, Search, Flame, Star, Trophy, ScrollText, Megaphone, GraduationCap, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSlider } from "@/components/HeroSlider";
import { FormationCard } from "@/components/FormationCard";
import { FORMATION_CATEGORIES } from "@/lib/formation-categories";
import defaultCover from "@/assets/formation-business.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "M'BossTsika — Plateforme de formation premium" },
      { name: "description", content: "Découvrez des formations professionnelles premium en ligne — certificats, diplômes et apprentissage continu." },
    ],
  }),
  component: HomePage,
});

function SectionHeader({ icon: Icon, title, accent }: { icon: any; title: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={"h-9 w-9 rounded-xl grid place-items-center text-white shadow " + (accent ?? "bg-gradient-primary")}>
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}

function FormationGrid({ items, empty }: { items: any[] | undefined; empty?: string }) {
  if (!items) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
    </div>
  );
  if (items.length === 0) return <p className="text-sm text-muted-foreground italic">{empty ?? "Aucun élément."}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
      {items.map((f) => <FormationCard key={f.id} formation={f} />)}
    </div>
  );
}

function HomePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [q, setQ] = useState("");

  const { data: formations } = useQuery({
    queryKey: ["home-formations"],
    queryFn: async () => (await supabase.from("formations").select("*, modules(count)").eq("is_active", true).eq("status", "approved").order("display_order")).data ?? [],
  });
  const { data: announcements } = useQuery({
    queryKey: ["home-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(6)).data ?? [],
  });
  const { data: topStudents } = useQuery({
    queryKey: ["home-top-students"], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email, avatar_url").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });
  const { data: certificates } = useQuery({
    queryKey: ["home-recent-certs"], enabled: !!user,
    queryFn: async () => (await supabase.from("certificates").select("id, created_at, formation_id, formations(title)").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  const filtered = useMemo(() => {
    if (!formations) return undefined;
    if (!q.trim()) return formations;
    const s = q.toLowerCase();
    return formations.filter((f: any) =>
      f.title?.toLowerCase().includes(s) || f.description?.toLowerCase().includes(s) || f.category?.toLowerCase().includes(s),
    );
  }, [formations, q]);

  const newest = useMemo(() => formations ? [...formations].sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6) : undefined, [formations]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" /> M'BossTsika
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">{t("home.hero_title")}</h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">{t("home.hero_subtitle")}</p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/auth"><Button size="lg" variant="secondary" className="gap-2"><LogIn className="h-4 w-4" />{t("nav.login")}</Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">{t("nav.signup")}</Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientLayout>
      <HeroSlider />

      {/* Search */}
      <div className="relative mb-10 -mt-2">
        <div className="relative flex items-center gap-2 bg-card border border-border/60 rounded-2xl shadow-card p-2 pl-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une formation, une école, une catégorie..."
            className="border-0 bg-transparent focus-visible:ring-0 text-base h-11" />
          {q && <Button variant="ghost" size="sm" onClick={() => setQ("")}>Effacer</Button>}
        </div>
      </div>

      {q && (
        <section className="mb-10">
          <SectionHeader icon={Search} title={`Résultats (${filtered?.length ?? 0})`} />
          <FormationGrid items={filtered} empty="Aucune formation ne correspond." />
        </section>
      )}

      {!q && (
        <>
          <section className="mb-10">
            <SectionHeader icon={LayoutGrid} title="📚 Explorer par catégorie" accent="bg-gradient-to-br from-indigo-500 to-blue-600" />
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {FORMATION_CATEGORIES.slice(0, 12).map((cat) => {
                const slug = encodeURIComponent(cat);
                const count = formations?.filter((f: any) => f.category === cat).length ?? 0;
                return (
                  <Link key={cat} to="/categories/$slug" params={{ slug }} className="group">
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border/50 hover:border-primary/40 shadow-card hover:shadow-elegant transition-shadow">
                      <img src={defaultCover} alt={cat} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-x-2 bottom-2 text-white">
                        <p className="font-semibold text-sm line-clamp-2" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{cat}</p>
                        <p className="text-[10px] opacity-90">{count > 0 ? `${count} formation${count > 1 ? "s" : ""}` : "Bientôt disponible"}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 text-center">
              <Link to="/categories"><Button variant="outline" className="gap-2"><LayoutGrid className="h-4 w-4" /> Voir toutes les catégories</Button></Link>
            </div>
          </section>

          <section className="mb-10">
            <SectionHeader icon={Flame} title="🔥 Formations populaires" accent="bg-gradient-to-br from-orange-500 to-red-500" />
            <FormationGrid items={formations} />
          </section>

          <section className="mb-10">
            <SectionHeader icon={Star} title="⭐ Recommandées pour vous" accent="bg-gradient-to-br from-amber-500 to-yellow-500" />
            <FormationGrid items={formations?.slice(0, 6)} />
          </section>

          <section className="mb-10">
            <SectionHeader icon={GraduationCap} title="🎓 Nouvelles formations" accent="bg-gradient-to-br from-violet-500 to-purple-600" />
            <FormationGrid items={newest} />
          </section>

          <div className="grid gap-8 lg:grid-cols-2 mb-10">
            <section>
              <SectionHeader icon={Trophy} title="🏆 Meilleurs étudiants" accent="bg-gradient-to-br from-gold to-amber-500" />
              <Card><CardContent className="py-4 divide-y">
                {(topStudents ?? []).map((u, i) => (
                  <div key={u.id} className="py-2.5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-primary grid place-items-center text-white text-sm font-bold">{i + 1}</div>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-sm">{(u.full_name?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}</div>}
                    <div className="flex-1 min-w-0"><p className="font-medium truncate">{u.full_name || u.email}</p></div>
                  </div>
                ))}
                {topStudents?.length === 0 && <p className="text-sm text-muted-foreground italic py-2">Aucun étudiant.</p>}
              </CardContent></Card>
            </section>

            <section>
              <SectionHeader icon={ScrollText} title="📜 Derniers certificats" accent="bg-gradient-to-br from-emerald-500 to-teal-600" />
              <Card><CardContent className="py-4 divide-y">
                {(certificates ?? []).map((c: any) => (
                  <div key={c.id} className="py-2.5 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center"><ScrollText className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.formations?.title ?? "Formation"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {certificates?.length === 0 && <p className="text-sm text-muted-foreground italic py-2">Aucun certificat délivré pour l'instant.</p>}
              </CardContent></Card>
            </section>
          </div>

          {announcements && announcements.length > 0 && (
            <section className="mb-10">
              <SectionHeader icon={Megaphone} title="📢 Annonces récentes" accent="bg-gradient-to-br from-blue-500 to-indigo-600" />
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {announcements.map((a) => (
                  <Card key={a.id} className="border-l-4 border-l-primary shadow-card">
                    <CardHeader className="pb-2"><CardTitle className="text-base">{a.title}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground line-clamp-3">{a.body}</p></CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </ClientLayout>
  );
}
