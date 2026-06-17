import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GraduationCap, Sparkles, ArrowRight, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "M'BossTsika — Accueil" }] }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  const { data: formations } = useQuery({
    queryKey: ["formations"],
    queryFn: async () => {
      const { data } = await supabase.from("formations").select("*").eq("is_active", true).order("display_order");
      return data ?? [];
    },
  });
  const { data: announcements } = useQuery({
    queryKey: ["announcements", "active"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">…</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="max-w-2xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-medium mb-6">
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
      <section className="rounded-2xl bg-gradient-hero p-6 md:p-10 text-white shadow-elegant mb-8">
        <h1 className="text-2xl md:text-4xl font-bold mb-2">{t("home.hero_title")}</h1>
        <p className="opacity-90 mb-4">{t("home.hero_subtitle")}</p>
        <Link to="/formations"><Button variant="secondary" className="gap-2">{t("home.explore")} <ArrowRight className="h-4 w-4" /></Button></Link>
      </section>

      {announcements && announcements.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">{t("home.announcements")}</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <Card key={a.id} className="shadow-card border-l-4 border-l-primary">
                <CardHeader className="pb-2"><CardTitle className="text-base">{a.title}</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{a.body}</p></CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">{t("home.featured")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {formations?.map((f) => (
            <Link key={f.id} to="/formations/$id" params={{ id: f.id }}>
              <Card className="hover:shadow-elegant hover:-translate-y-1 transition-all cursor-pointer h-full overflow-hidden border-gold/20">
                <div className="aspect-video bg-gradient-hero relative flex items-center justify-center">
                  <GraduationCap className="h-14 w-14 text-white/90 drop-shadow-lg" />
                  <div className="absolute top-2 right-2 bg-gold text-gold-foreground text-[10px] font-bold px-2 py-1 rounded-full shadow">
                    PREMIUM
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{f.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </ClientLayout>
  );
}
