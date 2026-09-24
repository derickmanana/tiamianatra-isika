import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Home, GraduationCap, Layers, Wallet, Bell, MessageSquare, User, LogOut, Shield, Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePartner } from "@/hooks/use-partner";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LegalFooter } from "@/components/LegalFooter";
import { takePendingAcceptances, clearPendingAcceptances } from "@/lib/legal";

export function ClientLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isAdmin, user } = useAuth();
  const { partner } = usePartner();
  const emailUnconfirmed = !!user && !user.email_confirmed_at;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Enregistre les acceptations faites à l'inscription dès qu'une session existe
  useEffect(() => {
    if (!user) return;
    const pending = takePendingAcceptances();
    if (!pending.length) return;
    (async () => {
      const { error } = await supabase.from("legal_acceptances").upsert(
        pending.map((p) => ({ user_id: user.id, document_slug: p.slug, document_version: p.version })),
        { onConflict: "user_id,document_slug,document_version", ignoreDuplicates: true },
      );
      if (!error) clearPendingAcceptances();
    })();
  }, [user]);

  const resendConfirmation = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
    else toast.success("Un nouvel email de vérification vient d'être envoyé.");
  };



  const items = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/formations", label: t("nav.formations"), icon: GraduationCap },
    { to: "/mes-modules", label: t("nav.my_modules"), icon: Layers },
    { to: "/paiements", label: t("nav.payments"), icon: Wallet },
    { to: "/affiliation", label: t("nav.affiliation"), icon: Sparkles },
    { to: "/notifications", label: t("nav.notifications"), icon: Bell },
    { to: "/messages", label: t("nav.messages"), icon: MessageSquare },
    { to: "/profil", label: t("nav.profile"), icon: User },
  ];

  const mobileItems = items.filter((i) =>
    ["/", "/formations", "/mes-modules", "/affiliation", "/profil"].includes(i.to),
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("auth.logged_out"));
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95">
        <div className="container mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="h-7 w-7 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground text-sm shadow-elegant">M</span>
            <span className="bg-gradient-to-r from-primary to-gold bg-clip-text text-transparent">M'BossTsika</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {items.map((it) => {
              const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground/80"
                  }`}>
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            {partner && partner.status === "approved" && (
              <Link to="/partenaire">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Formateur</span>
                </Button>
              </Link>
            )}
            {!partner && (
              <Link to="/partenaire" className="hidden md:inline-flex">
                <Button variant="ghost" size="sm">Devenir formateur</Button>
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="gap-1.5 border-gold/50">
                  <Shield className="h-4 w-4 text-gold" /> <span className="hidden sm:inline">{t("nav.admin")}</span>
                </Button>
              </Link>
            )}
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {emailUnconfirmed && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 text-amber-900 dark:text-amber-200 text-sm">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <span>⚠️ Veuillez confirmer votre email pour débloquer l'accès complet.</span>
            <button onClick={resendConfirmation} className="underline font-medium whitespace-nowrap">
              Renvoyer l'email
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 lg:pb-6">{children}</main>

      <LegalFooter />

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-elegant">
        <div className="grid grid-cols-5">
          {mobileItems.map((it) => {
            const Icon = it.icon;
            const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to}
                className={`flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                <div className={`p-1.5 rounded-lg transition ${active ? "bg-primary/10" : ""}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate max-w-full px-1">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
