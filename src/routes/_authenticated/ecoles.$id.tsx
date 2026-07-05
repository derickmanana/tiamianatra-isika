import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { School } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { FormationCard } from "@/components/FormationCard";
import { Card, CardContent } from "@/components/ui/card";

const searchSchema = z.object({ category: z.string().optional() });

export const Route = createFileRoute("/_authenticated/ecoles/$id")({
  validateSearch: (s) => searchSchema.parse(s),
  component: EcoleDetail,
});

function EcoleDetail() {
  const { id } = Route.useParams();
  const { category } = Route.useSearch();

  const { data: school } = useQuery({
    queryKey: ["school", id],
    queryFn: async () => (await supabase.from("schools").select("*").eq("id", id).maybeSingle()).data,
  });

  const { data: formations } = useQuery({
    queryKey: ["school-formations", id, category ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("formations")
        .select("*, modules(count)")
        .eq("school_id", id)
        .eq("is_active", true)
        .eq("status", "approved")
        .order("display_order");
      if (category) q = q.eq("category", category);
      const { data } = await q;
      return data ?? [];
    },
  });

  return (
    <ClientLayout>
      <BackButton />
      {school && (
        <div className="mb-6 flex items-center gap-4">
          {school.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="h-16 w-16 rounded-2xl object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-gradient-primary grid place-items-center"><School className="h-8 w-8 text-white" /></div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{school.name}</h1>
            {school.description && <p className="text-sm text-muted-foreground line-clamp-2">{school.description}</p>}
          </div>
        </div>
      )}

      {formations && formations.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground italic">
          Aucune formation disponible pour cette école {category ? `dans « ${category} »` : ""}.
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {formations?.map((f: any) => <FormationCard key={f.id} formation={f} />)}
      </div>
    </ClientLayout>
  );
}
