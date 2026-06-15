import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Home, GraduationCap, Layers, Wallet, Bell, MessageSquare, User, LogOut, Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ClientLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/formations", label: t("nav.formations"), icon: GraduationCap },
    { to: "/mes-modules", label: t("nav.my_modules"), icon: Layers },
    { to: "/paiements", label: t("nav.payments"), icon: Wallet },
    { to: "/notifications", label: t("nav.notifications"), icon: Bell },
    { to: "/messages", label: t("nav.messages"), icon: MessageSquare },
    { to: "/profil", label: t("nav.profile"), icon: User },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t("auth.logged_out"));
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b backdrop-blur bg-background/80">
        <div className="container mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="bg-gradient-primary bg-clip-text text-transparent">M'BossTsika</span>
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
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Shield className="h-4 w-4" /> <span className="hidden sm:inline">{t("nav.admin")}</span>
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

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 lg:pb-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="grid grid-cols-7">
          {items.map((it) => {
            const Icon = it.icon;
            const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to}
                className={`flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}>
                <Icon className="h-4 w-4" />
                <span className="truncate max-w-full px-1">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
