import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Partner = {
  id: string;
  user_id: string;
  partner_type: "formateur" | "recruteur";
  display_name: string;
  company: string | null;
  bio: string | null;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  commission_rate: number;
};

export function usePartner() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["partner", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Partner | null> => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Partner) ?? null;
    },
  });
  return { partner: q.data ?? null, isLoading: q.isLoading, refetch: q.refetch };
}
