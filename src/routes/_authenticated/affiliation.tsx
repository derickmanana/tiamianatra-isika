import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Copy, Gift, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getOrCreateAffiliateCode } from "@/lib/affiliate.functions";

export const Route = createFileRoute("/_authenticated/affiliation")({ component: Affiliation });

function Affiliation() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const create = useServerFn(getOrCreateAffiliateCode);

  const { data: code } = useQuery({
    queryKey: ["aff_code", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const existing = await supabase
        .from("affiliate_codes")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return existing.data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile_aff", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("affiliate_bonus_percent, free_modules_credit")
          .eq("id", user!.id)
          .single()
      ).data,
  });

  const { data: uses } = useQuery({
    queryKey: ["aff_uses", code?.id],
    enabled: !!code?.id,
    queryFn: async () =>
      (
        await supabase
          .from("affiliate_uses")
          .select("created_at, used_by")
          .eq("code_id", code!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const generate = useMutation({
    mutationFn: async () => create(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aff_code"] });
      toast.success(t("affiliate.generated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expired = code && new Date(code.expires_at) < new Date();
  const remaining = code && !expired
    ? Math.ceil((new Date(code.expires_at).getTime() - Date.now()) / 86400000)
    : 0;

  return (
    <ClientLayout>
      <BackButton />
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-6 w-6 text-gold" />
        <h1 className="text-2xl font-bold">{t("affiliate.title")}</h1>
      </div>
      <p className="text-muted-foreground mb-6">{t("affiliate.subtitle")}</p>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="shadow-card border-gold/30">
          <CardContent className="py-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" /> {t("affiliate.total_uses")}
            </div>
            <p className="text-3xl font-bold mt-2">{code?.total_uses_count ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-gold/30">
          <CardContent className="py-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Sparkles className="h-4 w-4" /> {t("affiliate.bonus")}
            </div>
            <p className="text-3xl font-bold mt-2 text-primary">
              +{Number(profile?.affiliate_bonus_percent ?? 0)}%
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-gold border-gold/40 bg-gradient-to-br from-card to-accent/5">
          <CardContent className="py-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Gift className="h-4 w-4" /> {t("affiliate.free_modules")}
            </div>
            <p className="text-3xl font-bold mt-2 text-gold">{profile?.free_modules_credit ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-elegant overflow-hidden">
        <div className="h-2 bg-gradient-gold" />
        <CardHeader>
          <CardTitle>{t("affiliate.your_code")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!code || expired ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">
                {expired ? t("affiliate.expired_msg") : t("affiliate.none_yet")}
              </p>
              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
                className="bg-gradient-gold text-gold-foreground hover:opacity-90"
              >
                {t("affiliate.generate")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/10 border border-gold/30">
                <span className="font-mono text-3xl font-bold tracking-widest text-primary">
                  {code.code}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(code.code);
                    toast.success(t("affiliate.copied"));
                  }}
                >
                  <Copy className="h-4 w-4 mr-1" /> {t("affiliate.copy")}
                </Button>
                <Badge variant="secondary" className="ml-auto">
                  {t("affiliate.expires_in", { days: remaining })}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• {t("affiliate.rule_discount")}</p>
                <p>• {t("affiliate.rule_bonus")}</p>
                <p>• {t("affiliate.rule_free")}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t("affiliate.recent_uses")}</p>
                {!uses?.length ? (
                  <p className="text-xs text-muted-foreground">{t("affiliate.no_uses")}</p>
                ) : (
                  <div className="space-y-1">
                    {uses.slice(0, 5).map((u, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex justify-between">
                        <span>{t("affiliate.use_n", { n: i + 1 })}</span>
                        <span>{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </ClientLayout>
  );
}
