import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, FileText, Cookie, Mail, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { COOKIE_POLICY_VERSION, readCookiePrefs, writeCookiePrefs } from "@/lib/legal";
import { usePublishedLegalDocs } from "@/lib/legal-queries";

export function LegalPrivacySection() {
  const { user } = useAuth();
  const { data: docs } = usePublishedLegalDocs();
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = readCookiePrefs();
    if (stored) {
      setPreferences(stored.preferences);
      setAnalytics(stored.analytics);
    }
  }, []);

  const { data: acceptances } = useQuery({
    queryKey: ["legal-acceptances", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_acceptances")
        .select("document_slug, document_version, accepted_at")
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const savePrefs = async () => {
    setSaving(true);
    writeCookiePrefs({ preferences, analytics });
    if (user) {
      const { error } = await supabase.from("cookie_consents").upsert(
        {
          user_id: user.id,
          necessary: true,
          preferences,
          analytics,
          policy_version: COOKIE_POLICY_VERSION,
          decided_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) {
        setSaving(false);
        return toast.error("Enregistrement impossible : " + error.message);
      }
    }
    setSaving(false);
    toast.success("Préférences de cookies enregistrées.");
  };

  return (
    <Card className="max-w-2xl mt-6 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" /> Confidentialité et documents juridiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Documents
          </p>
          <div className="grid gap-1.5">
            {(docs ?? []).map((d) => (
              <Link
                key={d.id}
                to="/legal/$slug"
                params={{ slug: d.slug }}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary/50 hover:bg-muted/40 transition-colors"
              >
                <span className="truncate">{d.title}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">v{d.version}</Badge>
              </Link>
            ))}
            {!docs?.length && <p className="text-xs text-muted-foreground italic">Aucun document publié.</p>}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Cookie className="h-4 w-4 text-muted-foreground" /> Préférences de cookies
          </p>
          <div className="space-y-2.5 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-semibold">Strictement nécessaires</Label>
                <p className="text-[11px] text-muted-foreground">Connexion, sécurité, session. Toujours actifs.</p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-semibold">Préférences</Label>
                <p className="text-[11px] text-muted-foreground">Mémorisation de la langue et du thème.</p>
              </div>
              <Switch checked={preferences} onCheckedChange={setPreferences} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-semibold">Mesure d'audience</Label>
                <p className="text-[11px] text-muted-foreground">Aucun outil de mesure n'est actuellement utilisé.</p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <Button size="sm" onClick={savePrefs} disabled={saving} className="bg-gradient-primary">
              {saving ? "…" : "Enregistrer mes préférences"}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Check className="h-4 w-4 text-muted-foreground" /> Versions acceptées
          </p>
          {acceptances && acceptances.length > 0 ? (
            <ul className="text-xs text-muted-foreground space-y-1">
              {acceptances.map((a: any) => (
                <li key={`${a.document_slug}-${a.document_version}`}>
                  {a.document_slug} — v{a.document_version} · {new Date(a.accepted_at).toLocaleDateString("fr-FR")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Aucune acceptation enregistrée pour ce compte (comptes créés avant cette fonctionnalité).
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-1.5 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" /> Demandes relatives à vos données
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Accès, rectification, suppression, opposition, retrait du consentement : la procédure est détaillée dans la
            page dédiée.
          </p>
          <Link to="/legal/$slug" params={{ slug: "contact-donnees" }}>
            <Button size="sm" variant="outline">Contact et données personnelles</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
