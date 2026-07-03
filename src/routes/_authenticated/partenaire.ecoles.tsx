import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { School as SchoolIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/ecoles")({
  component: EcolesPage,
});

function EcolesPage() {
  const { data: schools } = useQuery({
    queryKey: ["ref-schools-all"],
    queryFn: async () => (await supabase.from("schools").select("*").eq("is_active", true).order("display_order")).data ?? [],
  });
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        Liste des écoles proposées par M'BossTsika. Choisissez-en une lors de la création de votre formation.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(schools ?? []).map((s: any) => (
          <Card key={s.id} className="p-4 flex items-center gap-3">
            {s.logo_url ? (
              <img src={s.logo_url} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                <SchoolIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{s.name}</div>
              {s.country && <div className="text-xs text-muted-foreground">{s.country}</div>}
            </div>
          </Card>
        ))}
        {(!schools || schools.length === 0) && (
          <div className="col-span-full text-center text-muted-foreground py-8 border rounded-lg">
            Aucune école disponible.
          </div>
        )}
      </div>
    </div>
  );
}
