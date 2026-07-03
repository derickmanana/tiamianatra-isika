import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/partenaire/tracks")({
  component: TracksPage,
});

function TracksPage() {
  const { data } = useQuery({
    queryKey: ["ref-tracks-all"],
    queryFn: async () => (await supabase.from("learning_tracks").select("*").eq("is_active", true).order("display_order")).data ?? [],
  });
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        Types d'apprentissage disponibles (à sélectionner lors de la création d'une formation).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(data ?? []).map((t: any) => (
          <Card key={t.id} className="p-4">
            <div className="font-semibold">{t.label}</div>
            {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
            <div className="text-xs mt-1">Multiplicateur : ×{t.price_multiplier}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
