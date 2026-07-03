import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ClientLayout } from "@/components/ClientLayout";
import { usePartner } from "@/hooks/use-partner";
import { PartnerOnboarding } from "@/components/partner/PartnerOnboarding";
import { LayoutDashboard, GraduationCap, Briefcase, School, Layers, Clock, MessageSquare, BookOpen } from "lucide-react";


export const Route = createFileRoute("/_authenticated/partenaire")({
  component: PartnerLayout,
});

function PartnerLayout() {
  const { partner, isLoading, refetch } = usePartner();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-8 text-center text-muted-foreground">Chargement...</div>
      </ClientLayout>
    );
  }

  if (!partner) {
    return (
      <ClientLayout>
        <PartnerOnboarding onCreated={() => refetch()} />
      </ClientLayout>
    );
  }

  if (partner.status !== "approved") {
    return (
      <ClientLayout>
        <div className="max-w-2xl mx-auto p-6 rounded-lg border bg-card">
          <h1 className="text-2xl font-bold mb-2">Espace Partenaire</h1>
          <p className="text-muted-foreground mb-4">
            Statut de votre compte : <span className="font-semibold uppercase">{partner.status}</span>
          </p>
          {partner.status === "pending" && (
            <p>Votre demande est en cours d'examen par l'administrateur. Vous recevrez une notification dès validation.</p>
          )}
          {partner.status === "rejected" && <p>Votre demande a été refusée. Contactez l'administrateur.</p>}
          {partner.status === "suspended" && <p>Votre compte est suspendu.</p>}
        </div>
      </ClientLayout>
    );
  }

  const tabs = partner.partner_type === "formateur"
    ? [
        { to: "/partenaire", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
        { to: "/partenaire/formations", label: "Mes formations", icon: GraduationCap, exact: false },
        { to: "/partenaire/modules", label: "Mes modules", icon: BookOpen, exact: false },
        { to: "/partenaire/ecoles", label: "Écoles", icon: School, exact: false },
        { to: "/partenaire/tracks", label: "Types apprentissage", icon: Layers, exact: false },
        { to: "/partenaire/durees", label: "Durées", icon: Clock, exact: false },
        { to: "/partenaire/messages", label: "Messages", icon: MessageSquare, exact: false },
      ]
    : [
        { to: "/partenaire", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
        { to: "/partenaire/offres", label: "Mes offres", icon: Briefcase, exact: false },
        { to: "/partenaire/messages", label: "Messages", icon: MessageSquare, exact: false },
      ];


  return (
    <ClientLayout>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          Espace {partner.partner_type === "formateur" ? "Formateur" : "Recruteur"}
        </h1>
        <p className="text-muted-foreground text-sm">{partner.display_name}</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`px-4 py-2 rounded-t-md text-sm font-medium whitespace-nowrap flex items-center gap-2 border-b-2 -mb-[2px] ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </ClientLayout>
  );
}
