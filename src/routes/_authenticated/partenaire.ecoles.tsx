import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePartner } from "@/hooks/use-partner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { School as SchoolIcon, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/ecoles")({
  component: MyEcolePage,
});

type SchoolForm = {
  id?: string;
  name: string;
  logo_url: string;
  cover_url: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  social_facebook: string;
  social_instagram: string;
  social_linkedin: string;
};

const empty: SchoolForm = {
  name: "", logo_url: "", cover_url: "", description: "",
  address: "", city: "", country: "", phone: "", email: "", website: "",
  social_facebook: "", social_instagram: "", social_linkedin: "",
};

function MyEcolePage() {
  const { partner } = usePartner();
  const qc = useQueryClient();
  const [form, setForm] = useState<SchoolForm>(empty);
  const [saving, setSaving] = useState(false);

  const { data: school } = useQuery({
    queryKey: ["my-school", partner?.id],
    enabled: !!partner,
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("*")
        .eq("owner_partner_id", partner!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (school) {
      const s: any = school;
      setForm({
        id: s.id,
        name: s.name ?? "",
        logo_url: s.logo_url ?? "",
        cover_url: s.cover_url ?? "",
        description: s.description ?? "",
        address: s.address ?? "",
        city: s.city ?? "",
        country: s.country ?? "",
        phone: s.phone ?? "",
        email: s.email ?? "",
        website: s.website ?? "",
        social_facebook: s.social_links?.facebook ?? "",
        social_instagram: s.social_links?.instagram ?? "",
        social_linkedin: s.social_links?.linkedin ?? "",
      });
    }
  }, [school]);

  const save = async () => {
    if (!partner) return;
    if (!form.name.trim()) { toast.error("Nom de l'école requis"); return; }
    setSaving(true);
    const payload: any = {
      name: form.name.trim(),
      logo_url: form.logo_url.trim() || null,
      cover_url: form.cover_url.trim() || null,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      social_links: {
        facebook: form.social_facebook.trim() || undefined,
        instagram: form.social_instagram.trim() || undefined,
        linkedin: form.social_linkedin.trim() || undefined,
      },
      owner_partner_id: partner.id,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from("schools").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("schools").insert({ ...payload, status: "pending" }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "École mise à jour" : "École créée — en attente de validation");
    qc.invalidateQueries({ queryKey: ["my-school"] });
  };

  if (partner?.partner_type !== "formateur") {
    return <div className="text-center text-muted-foreground py-8">Réservé aux formateurs.</div>;
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-4 mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
          <SchoolIcon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Mon École / Centre de Formation</div>
          <p className="text-xs text-muted-foreground">
            Créez et gérez votre propre école. Elle sera liée à toutes vos formations.
          </p>
        </div>
        {school && <Badge variant="outline">{(school as any).status}</Badge>}
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>Nom de l'école *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>URL du logo</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." /></div>
          <div><Label>URL image de couverture</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." /></div>
        </div>
        <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Site Web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Facebook</Label><Input value={form.social_facebook} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} /></div>
          <div><Label>Instagram</Label><Input value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} /></div>
          <div><Label>LinkedIn</Label><Input value={form.social_linkedin} onChange={(e) => setForm({ ...form, social_linkedin: e.target.value })} /></div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{form.id ? "Enregistrer" : "Créer mon école"}</Button>
        </div>
      </Card>
    </div>
  );
}
