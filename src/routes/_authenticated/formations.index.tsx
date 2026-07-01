import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Input } from "@/components/ui/input";
import { FormationCard } from "@/components/FormationCard";

export const Route = createFileRoute("/_authenticated/formations/")({
  component: FormationsPage,
});

function FormationsPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["formations"],
    queryFn: async () => (await supabase.from("formations").select("*, modules(count)").eq("is_active", true).eq("status", "approved").order("display_order")).data ?? [],
  });
  const filtered = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data;
    const s = q.toLowerCase();
    return data.filter((f: any) => f.title?.toLowerCase().includes(s) || f.description?.toLowerCase().includes(s));
  }, [data, q]);
  return (
    <ClientLayout>
      <BackButton />
      <h1 className="text-2xl font-bold mb-4">{t("nav.formations")}</h1>
      <div className="flex items-center gap-2 bg-card border rounded-2xl shadow-card p-2 pl-4 mb-6">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." className="border-0 bg-transparent focus-visible:ring-0" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((f: any) => <FormationCard key={f.id} formation={f} />)}
      </div>
    </ClientLayout>
  );
}
