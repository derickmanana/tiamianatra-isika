import { createFileRoute } from "@tanstack/react-router";
import { usePartner } from "@/hooks/use-partner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/partenaire/")({
  component: Dashboard,
});

function Dashboard() {
  const { partner } = usePartner();

  const { data: stats } = useQuery({
    queryKey: ["partner-stats", partner?.id, partner?.partner_type],
    enabled: !!partner,
    queryFn: async () => {
      if (partner!.partner_type === "formateur") {
        const { count: formCount } = await supabase
          .from("formations")
          .select("id", { count: "exact", head: true })
          .eq("owner_partner_id", partner!.id);
        const { count: approved } = await supabase
          .from("formations")
          .select("id", { count: "exact", head: true })
          .eq("owner_partner_id", partner!.id)
          .eq("status", "approved");
        return { total: formCount ?? 0, approved: approved ?? 0 };
      } else {
        const { count: jobs } = await supabase
          .from("job_offers")
          .select("id", { count: "exact", head: true })
          .eq("partner_id", partner!.id);
        const { data: myJobs } = await supabase
          .from("job_offers")
          .select("id")
          .eq("partner_id", partner!.id);
        const ids = (myJobs ?? []).map((j: any) => j.id);
        let apps = 0;
        if (ids.length) {
          const { count } = await supabase
            .from("job_applications")
            .select("id", { count: "exact", head: true })
            .in("job_id", ids);
          apps = count ?? 0;
        }
        return { total: jobs ?? 0, apps };
      }
    },
  });

  if (!partner) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {partner.partner_type === "formateur" ? (
        <>
          <StatCard label="Formations totales" value={stats?.total ?? 0} />
          <StatCard label="Formations approuvées" value={stats?.approved ?? 0} />
          <StatCard label="Taux de commission" value={`${partner.commission_rate}%`} />
        </>
      ) : (
        <>
          <StatCard label="Offres publiées" value={stats?.total ?? 0} />
          <StatCard label="Candidatures reçues" value={stats?.apps ?? 0} />
          <StatCard label="Taux de commission" value={`${partner.commission_rate}%`} />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </Card>
  );
}
