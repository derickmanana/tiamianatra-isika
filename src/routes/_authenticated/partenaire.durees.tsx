import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/durees")({
  component: DureesPage,
});

function DureesPage() {
  const { data } = useQuery({
    queryKey: ["ref-durations-all"],
    queryFn: async () => (await supabase.from("course_durations").select("*").eq("is_active", true).order("display_order")).data ?? [],
  });
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        Durées proposées pour vos formations.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(data ?? []).map((d: any) => (
          <Card key={d.id} className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <div className="font-semibold">{d.name}</div>
              <div className="text-xs text-muted-foreground">
                {d.duration_weeks ? `${d.duration_weeks} semaines` : "Durée libre"} · ×{d.price_multiplier}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
