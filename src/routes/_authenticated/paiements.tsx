import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/paiements")({ component: Payments });

function Payments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["payments", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("payments").select("*, modules(title)").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("payment.history")}</h1>
      {(!data || data.length === 0) ? <p className="text-muted-foreground">{t("payment.no_payments")}</p> : (
        <div className="grid gap-3">
          {data.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{p.modules?.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()} • {p.amount_ariary.toLocaleString()} Ar</p>
                  {p.admin_comment && <p className="text-xs text-muted-foreground mt-1">{p.admin_comment}</p>}
                </div>
                <Badge variant={p.status === "validated" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                  {t(`common.${p.status === "validated" ? "validated" : p.status === "rejected" ? "rejected" : "pending"}`)}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ClientLayout>
  );
}
