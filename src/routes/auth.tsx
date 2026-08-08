import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { GraduationCap, Briefcase, User } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "M'BossTsika — Connexion" }] }),
  component: AuthPage,
});

type SignupRole = "etudiant" | "formateur" | "recruteur";

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<SignupRole>("etudiant");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.logged_in"));

    // Redirection selon le partenariat existant
    const userId = data.user?.id;
    if (userId) {
      const { data: partner } = await supabase
        .from("partners")
        .select("partner_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (partner) {
        navigate({ to: "/partenaire" });
        return;
      }
    }
    navigate({ to: "/" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, data: { full_name: fullName, signup_role: role } },
    });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    // Si Formateur / Recruteur → créer une demande de partenariat (en attente)
    if (role !== "etudiant" && data.user) {
      const { error: pErr } = await supabase.from("partners").insert({
        user_id: data.user.id,
        partner_type: role,
        display_name: fullName || email.split("@")[0],
        status: "approved",
      });
      if (pErr) console.warn("Partner insert error:", pErr.message);
    }

    setLoading(false);
    toast.success("Inscription réussie ! Un email de confirmation vous a été envoyé.");

    // Si session immédiate (auto-confirm activé), rediriger. Sinon rester sur /auth avec message.
    if (data.session) {
      if (role === "etudiant") navigate({ to: "/" });
      else navigate({ to: "/partenaire" });
    }
  };

  const roleOptions: { value: SignupRole; label: string; desc: string; Icon: typeof User }[] = [
    { value: "etudiant", label: "Étudiant", desc: "Suivre des formations", Icon: User },
    { value: "formateur", label: "Formateur", desc: "Publier des formations", Icon: GraduationCap },
    { value: "recruteur", label: "Recruteur", desc: "Publier des offres d'emploi", Icon: Briefcase },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="absolute top-4 right-4 flex gap-2"><LanguageSelector /><ThemeToggle /></div>
      <div className="w-full max-w-md">
        <PWAInstallButton />
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              <span className="bg-gradient-primary bg-clip-text text-transparent">M'BossTsika</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("app.tagline")}</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="login">{t("nav.login")}</TabsTrigger>
                <TabsTrigger value="signup">{t("nav.signup")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div><Label>{t("common.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>{t("common.password")}</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>{t("auth.login_button")}</Button>
                </form>
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={resending || !email}
                  className="mt-3 w-full text-xs text-muted-foreground underline disabled:opacity-50"
                >
                  {resending ? "Envoi…" : "Renvoyer l'email de vérification"}
                </button>
              </TabsContent>


              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div>
                    <Label className="mb-2 block">Je m'inscris en tant que</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {roleOptions.map(({ value, label, desc, Icon }) => {
                        const active = role === value;
                        return (
                          <button
                            type="button"
                            key={value}
                            onClick={() => setRole(value)}
                            className={`p-2 rounded-md border text-center transition ${
                              active
                                ? "border-primary bg-primary/10 ring-2 ring-primary"
                                : "border-border hover:border-primary/60"
                            }`}
                          >
                            <Icon className="h-5 w-5 mx-auto mb-1" />
                            <div className="text-xs font-semibold">{label}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">{desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div><Label>{t("auth.full_name")}</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div><Label>{t("common.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label>{t("common.password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                    {loading ? "…" : t("auth.signup_button")}
                  </Button>
                  {role !== "etudiant" && (
                    <p className="text-xs text-muted-foreground text-center">
                      Votre demande de {role} sera examinée par l'administrateur.
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
