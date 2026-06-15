import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profil")({ component: Profile });

function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => { if (profile) { setFullName(profile.full_name ?? ""); setPhone(profile.phone ?? ""); } }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(t("profile.update_success"));
  };

  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("profile.title")}</h1>
      <Card className="max-w-xl">
        <CardHeader><CardTitle className="text-base">{user?.email}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-3">
            <div><Label>{t("auth.full_name")}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>{t("common.phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button type="submit" className="bg-gradient-primary">{t("common.save")}</Button>
          </form>
        </CardContent>
      </Card>
    </ClientLayout>
  );
}
