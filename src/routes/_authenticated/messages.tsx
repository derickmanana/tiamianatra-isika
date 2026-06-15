import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/messages")({ component: MessagesPage });

function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["messages", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("messages").select("*").or(`recipient_id.eq.${user!.id},is_broadcast.eq.true`).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("nav.messages")}</h1>
      {(!data || data.length === 0) ? <p className="text-muted-foreground">{t("messages.empty")}</p> : (
        <div className="grid gap-3">
          {data.map((m) => (
            <Card key={m.id}>
              <CardHeader><CardTitle className="text-base">{m.subject}</CardTitle><p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{m.body}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </ClientLayout>
  );
}
