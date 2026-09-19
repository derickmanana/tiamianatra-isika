import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Award, Camera, Download, Mail, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateCertificatePdf } from "@/lib/certificate";
import { StudentCvSection } from "@/components/student/StudentCvSection";

export const Route = createFileRoute("/_authenticated/profil")({ component: Profile });

const BADGE_LABELS: Record<string, { label: string; color: string }> = {
  debutant: { label: "Débutant", color: "bg-muted text-foreground" },
  bronze: { label: "Bronze", color: "bg-amber-700 text-white" },
  argent: { label: "Argent", color: "bg-slate-400 text-white" },
  or: { label: "Or", color: "bg-gold text-gold-foreground" },
  platine: { label: "Platine", color: "bg-gradient-primary text-primary-foreground" },
};

function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });

  const { data: badge } = useQuery({
    queryKey: ["badge", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_badge", { _user_id: user!.id });
      return (data as string) ?? "debutant";
    },
  });

  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar_signed", profile?.avatar_url],
    enabled: !!profile?.avatar_url,
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile!.avatar_url!, 3600);
      return data?.signedUrl ?? null;
    },
  });

  const { data: certificates } = useQuery({
    queryKey: ["my_certificates", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("certificates")
          .select("*, formations(title)")
          .eq("user_id", user!.id)
          .order("issued_at", { ascending: false })
      ).data ?? [],
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success(t("profile.update_success"));
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Max 2 Mo");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["avatar_signed"] });
    toast.success(t("profile.avatar_updated"));
  };

  const downloadCert = async (cert: any) => {
    if (cert.pdf_url) {
      const { data } = await supabase.storage
        .from("certificates")
        .createSignedUrl(cert.pdf_url, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      return;
    }
    const blob = await generateCertificatePdf({
      fullName: profile?.full_name || user?.email || "Apprenant",
      formationTitle: cert.formations?.title ?? "Formation",
      issuedAt: new Date(cert.issued_at),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Certificat-${cert.formations?.title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badgeInfo = BADGE_LABELS[badge ?? "debutant"];

  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("profile.title")}</h1>

      <Card className="max-w-2xl shadow-elegant overflow-hidden">
        <div className="h-24 bg-gradient-hero" />
        <CardContent className="-mt-12 pb-6">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-2xl bg-gradient-primary text-primary-foreground">
                  {(profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 bg-gold text-gold-foreground rounded-full p-1.5 shadow hover:scale-105 transition"
                aria-label="upload avatar"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarChange}
              />
            </div>
            <div className="flex-1 min-w-0 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate">
                  {profile?.full_name || user?.email}
                </h2>
                {badgeInfo && (
                  <Badge className={`${badgeInfo.color} animate-badge gap-1`}>
                    <Award className="h-3 w-3" /> {badgeInfo.label}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {user?.email}
                </span>
                {profile?.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>{t("auth.full_name")}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>{t("common.phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" className="bg-gradient-primary">
              {t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-2xl mt-6 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold" /> {t("profile.certificates")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!certificates?.length ? (
            <p className="text-muted-foreground text-sm">{t("profile.no_certificates")}</p>
          ) : (
            <div className="space-y-2">
              {certificates.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gold/30 bg-gradient-to-r from-card to-accent/5"
                >
                  <div>
                    <p className="font-medium">{c.formations?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadCert(c)}>
                    <Download className="h-4 w-4 mr-1" /> PDF
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </ClientLayout>
  );
}
