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

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "M'BossTsika — Connexion" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.logged_in"));
    navigate({ to: "/" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.signup_success"));
    navigate({ to: "/" });
  };

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
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3">
                <div><Label>{t("auth.full_name")}</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div><Label>{t("common.email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>{t("common.password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>{t("auth.signup_button")}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
