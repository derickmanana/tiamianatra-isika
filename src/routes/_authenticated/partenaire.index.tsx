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
    queryKey: ["partner-stats", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
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
    },
  });

  if (!partner) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Formations totales" value={stats?.total ?? 0} />
      <StatCard label="Formations approuvées" value={stats?.approved ?? 0} />
      <StatCard label="Taux de commission" value={`${partner.commission_rate}%`} />
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
