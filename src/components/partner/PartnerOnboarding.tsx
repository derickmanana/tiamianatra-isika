import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Briefcase } from "lucide-react";

export function PartnerOnboarding({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [type, setType] = useState<"formateur" | "recruteur" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !type || !displayName.trim()) {
      toast.error("Choisissez un type et un nom");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("partners").insert({
      user_id: user.id,
      partner_type: type,
      display_name: displayName.trim(),
      company: company.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      status: "pending",
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Demande envoyée à l'administrateur");
    onCreated();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Devenir Partenaire</h1>
      <p className="text-muted-foreground mb-6">
        Rejoignez l'écosystème M'BossTsika en tant que formateur ou recruteur.
      </p>

      {!type && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => setType("formateur")}
            className="p-6 border-2 rounded-lg text-left hover:border-primary transition"
          >
            <GraduationCap className="h-8 w-8 text-primary mb-2" />
            <div className="font-semibold text-lg">Formateur</div>
            <p className="text-sm text-muted-foreground mt-1">
              Publiez des formations vidéo et touchez une commission sur les ventes.
            </p>
          </button>
          <button
            onClick={() => setType("recruteur")}
            className="p-6 border-2 rounded-lg text-left hover:border-primary transition"
          >
            <Briefcase className="h-8 w-8 text-primary mb-2" />
            <div className="font-semibold text-lg">Recruteur</div>
            <p className="text-sm text-muted-foreground mt-1">
              Publiez des offres d'emploi et recevez les candidatures des étudiants.
            </p>
          </button>
        </div>
      )}

      {type && (
        <div className="space-y-4 p-6 border rounded-lg bg-card">
          <div className="text-sm text-muted-foreground">
            Type sélectionné : <b className="text-foreground">{type === "formateur" ? "Formateur" : "Recruteur"}</b>{" "}
            — <button className="underline" onClick={() => setType(null)}>changer</button>
          </div>
          <div>
            <Label>Nom affiché *</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <Label>Société / Organisme</Label>
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
            {loading ? "Envoi..." : "Envoyer ma demande"}
          </Button>
        </div>
      )}
    </div>
  );
}
