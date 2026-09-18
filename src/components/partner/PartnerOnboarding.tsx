import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export function PartnerOnboarding({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !displayName.trim()) {
      toast.error("Renseignez votre nom affiché");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("partners").insert({
      user_id: user.id,
      partner_type: "formateur",
      display_name: displayName.trim(),
      company: company.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      status: "approved",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Votre espace Formateur est prêt");
    onCreated();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Devenir Formateur</h1>
      <p className="text-muted-foreground mb-6">
        Publiez vos formations vidéo sur M'BossTsika et touchez une commission sur les ventes.
      </p>

      <div className="space-y-4 p-6 border rounded-lg bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-5 w-5 text-primary" />
          Espace Formateur
        </div>
        <div>
          <Label>Nom affiché *</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label>École / Organisme</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label>Site web</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>Présentation</Label>
          <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? "Création..." : "Créer mon espace Formateur"}
        </Button>
      </div>
    </div>
  );
}
