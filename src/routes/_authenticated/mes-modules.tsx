import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/mes-modules")({ component: MyModules });

function MyModules() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-modules", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("unlocked_modules")
        .select("*, modules(*, formations(title))").eq("user_id", user!.id).order("unlocked_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("nav.my_modules")}</h1>
      {(!data || data.length === 0) ? <p className="text-muted-foreground">—</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((u: any) => (
            <Link key={u.id} to="/modules/$id" params={{ id: u.module_id }}>
              <Card className="hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <p className="text-xs text-muted-foreground">{u.modules?.formations?.title}</p>
                  <CardTitle className="text-base">{u.modules?.title}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </ClientLayout>
  );
}
