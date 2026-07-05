import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, School, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/categories/$slug")({
  component: CategoryDetail,
});

function CategoryDetail() {
  const { slug } = Route.useParams();
  const category = decodeURIComponent(slug);
  const [q, setQ] = useState("");

  const { data: schools } = useQuery({
    queryKey: ["schools-by-category", category],
    queryFn: async () => {
      // Get formations in the category (approved+active) and their schools
      const { data: formations } = await supabase
        .from("formations")
        .select("school_id")
        .eq("category", category)
        .eq("is_active", true)
        .eq("status", "approved")
        .not("school_id", "is", null);
      const schoolIds = Array.from(new Set((formations ?? []).map((f: any) => f.school_id).filter(Boolean)));
      if (schoolIds.length === 0) return [];
      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name, description, logo_url, cover_url, city")
        .in("id", schoolIds)
        .eq("is_active", true);
      // count formations per school within this category
      const counts: Record<string, number> = {};
      (formations ?? []).forEach((f: any) => { if (f.school_id) counts[f.school_id] = (counts[f.school_id] ?? 0) + 1; });
      return (schoolsData ?? []).map((s: any) => ({ ...s, formationCount: counts[s.id] ?? 0 }));
    },
  });

  const filtered = useMemo(() => {
    if (!schools) return undefined;
    if (!q.trim()) return schools;
    const s = q.toLowerCase();
    return schools.filter((sc: any) => sc.name?.toLowerCase().includes(s) || sc.description?.toLowerCase().includes(s));
  }, [schools, q]);

  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl md:text-3xl font-bold mb-1">{category}</h1>
      <p className="text-muted-foreground mb-6">Écoles proposant cette formation</p>

      <div className="flex items-center gap-2 bg-card border rounded-2xl shadow-card p-2 pl-4 mb-6">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une école..." className="border-0 bg-transparent focus-visible:ring-0" />
      </div>

      {filtered && filtered.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground italic">
          Aucune école ne propose actuellement cette formation.
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((s: any) => (
          <Card key={s.id} className="overflow-hidden group hover:shadow-elegant transition-shadow flex flex-col">
            <div className="aspect-video relative overflow-hidden bg-muted">
              {s.cover_url ? (
                <img src={s.cover_url} alt={s.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-primary grid place-items-center">
                  <School className="h-12 w-12 text-white/80" />
                </div>
              )}
            </div>
            <CardContent className="p-4 flex-1 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {s.logo_url && <img src={s.logo_url} alt="" className="h-10 w-10 rounded-full object-cover border" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{s.name}</h3>
                  {s.city && <p className="text-xs text-muted-foreground truncate">{s.city}</p>}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{s.description || "—"}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> —</span>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" /> —</span>
                <span className="ml-auto font-medium text-foreground">{s.formationCount} formation{s.formationCount > 1 ? "s" : ""}</span>
              </div>
              <Link to="/ecoles/$id" params={{ id: s.id }} search={{ category }} className="mt-auto">
                <Button className="w-full bg-gradient-primary">Entrer</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </ClientLayout>
  );
}
