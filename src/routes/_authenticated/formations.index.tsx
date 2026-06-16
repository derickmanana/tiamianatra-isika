import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getFormationCover } from "@/lib/formation-covers";

export const Route = createFileRoute("/_authenticated/formations/")({
  component: FormationsPage,
});

function FormationsPage() {
  const { t } = useTranslation();
  const { data } = useQuery({
    queryKey: ["formations"],
    queryFn: async () => {
      const { data } = await supabase.from("formations").select("*, modules(count)").eq("is_active", true).order("display_order");
      return data ?? [];
    },
  });
  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("nav.formations")}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((f: any) => (
          <Link key={f.id} to="/formations/$id" params={{ id: f.id }}>
            <Card className="overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-1 h-full cursor-pointer group">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={getFormationCover(f)}
                  alt={f.title}
                  loading="lazy"
                  width={1280}
                  height={720}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <CardHeader>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription className="line-clamp-2">{f.description}</CardDescription>
                <p className="text-xs text-muted-foreground mt-2">{t("formation.modules_count", { count: f.modules?.[0]?.count ?? 0 })}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </ClientLayout>
  );
}
