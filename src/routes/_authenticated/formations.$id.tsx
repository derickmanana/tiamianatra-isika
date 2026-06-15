import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock, CheckCircle2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/formations/$id")({
  component: FormationDetail,
});

function FormationDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: formation } = useQuery({
    queryKey: ["formation", id],
    queryFn: async () => {
      const { data } = await supabase.from("formations").select("*").eq("id", id).single();
      return data;
    },
  });
  const { data: modules } = useQuery({
    queryKey: ["modules", id],
    queryFn: async () => {
      const { data } = await supabase.from("modules").select("*").eq("formation_id", id).order("display_order");
      return data ?? [];
    },
  });
  const { data: unlocked } = useQuery({
    queryKey: ["unlocked", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("unlocked_modules").select("module_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((u) => u.module_id));
    },
  });

  return (
    <ClientLayout>
      <BackButton />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{formation?.title}</h1>
        <p className="text-muted-foreground mt-1">{formation?.description}</p>
      </div>
      <div className="grid gap-3">
        {modules?.map((m, idx) => {
          const isUnlocked = unlocked?.has(m.id);
          const prevModule = modules[idx - 1];
          const prevUnlocked = !prevModule || unlocked?.has(prevModule.id);
          const accessible = isUnlocked || prevUnlocked;
          return (
            <Card key={m.id} className={!accessible ? "opacity-60" : "hover:shadow-elegant transition-shadow"}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    {isUnlocked ? <CheckCircle2 className="h-4 w-4 text-success" /> : accessible ? <PlayCircle className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    {t("module.order", { n: m.display_order })} — {m.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={isUnlocked ? "default" : "secondary"}>
                    {isUnlocked ? t("common.unlocked") : `${m.price_ariary.toLocaleString()} ${t("common.ariary")}`}
                  </Badge>
                  {accessible ? (
                    <Link to="/modules/$id" params={{ id: m.id }} className="text-sm font-medium text-primary hover:underline">
                      {isUnlocked ? t("common.view") : t("module.buy_to_unlock")}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("module.complete_previous")}</span>
                  )}
                </div>
              </CardHeader>
              {!m.is_available && m.unavailable_message && (
                <CardContent><p className="text-sm text-warning">{m.unavailable_message}</p></CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </ClientLayout>
  );
}
