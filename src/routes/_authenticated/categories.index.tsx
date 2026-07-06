import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, LayoutGrid, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FORMATION_CATEGORIES } from "@/lib/formation-categories";


export const Route = createFileRoute("/_authenticated/categories/")({
  component: CategoriesIndex,
});

function CategoriesIndex() {
  const [q, setQ] = useState("");
  const { data: counts } = useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("formations")
        .select("category")
        .eq("is_active", true)
        .eq("status", "approved");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.category) map[r.category] = (map[r.category] ?? 0) + 1;
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    if (!q.trim()) return FORMATION_CATEGORIES;
    const s = q.toLowerCase();
    return FORMATION_CATEGORIES.filter((c) => c.toLowerCase().includes(s));
  }, [q]);

  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Catégories de formations</h1>
      <p className="text-muted-foreground mb-6">Explorez toutes les catégories disponibles.</p>

      <div className="flex items-center gap-2 bg-card border rounded-2xl shadow-card p-2 pl-4 mb-6">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une catégorie..." className="border-0 bg-transparent focus-visible:ring-0" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((cat) => {
          const count = counts?.[cat] ?? 0;
          const slug = encodeURIComponent(cat);
          return (
            <Card key={cat} className="overflow-hidden group hover:shadow-elegant transition-shadow flex flex-col">
              <div className="aspect-video relative overflow-hidden bg-muted">
                <img src={defaultCover} alt={cat} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 text-white">
                  <h3 className="font-bold text-lg" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{cat}</h3>
                </div>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {count > 0
                    ? `${count} formation${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}`
                    : "Aucune école ne propose actuellement cette formation."}
                </p>
                <Link to="/categories/$slug" params={{ slug }} className="mt-auto">
                  <Button className="w-full bg-gradient-primary gap-2">
                    <GraduationCap className="h-4 w-4" /> Apprendre
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ClientLayout>
  );
}
