import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_SETTING_KEYS } from "@/lib/legal";

export type LegalDocRow = {
  id: string;
  slug: string;
  title: string;
  version: string;
  content: string;
  summary: string | null;
  last_updated: string;
  is_published: boolean;
  display_order: number;
};

/** Documents publiés (lecture publique). */
export function usePublishedLegalDocs() {
  return useQuery({
    queryKey: ["legal-docs-published"],
    queryFn: async (): Promise<LegalDocRow[]> => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("id, slug, title, version, content, summary, last_updated, is_published, display_order")
        .eq("is_published", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as LegalDocRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Informations légales configurables (table `settings`, lecture publique). */
export function useLegalSettings() {
  return useQuery({
    queryKey: ["legal-settings"],
    queryFn: async (): Promise<Record<string, string>> => {
      const keys = LEGAL_SETTING_KEYS.map((k) => k.key);
      const { data, error } = await supabase.from("settings").select("key, value").in("key", keys);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value as string]));
    },
    staleTime: 5 * 60 * 1000,
  });
}
