import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { COOKIE_POLICY_VERSION, readCookiePrefs, writeCookiePrefs } from "@/lib/legal";

async function persistForUser(prefs: { preferences: boolean; analytics: boolean }) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await supabase.from("cookie_consents").upsert(
    {
      user_id: userId,
      necessary: true,
      preferences: prefs.preferences,
      analytics: prefs.analytics,
      policy_version: COOKIE_POLICY_VERSION,
      decided_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [custom, setCustom] = useState(false);
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!readCookiePrefs()) setVisible(true);
  }, []);

  const decide = async (prefs: { preferences: boolean; analytics: boolean }) => {
    writeCookiePrefs(prefs);
    setVisible(false);
    setCustom(false);
    try {
      await persistForUser(prefs);
    } catch {
      /* la préférence locale reste enregistrée */
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pb-20 lg:pb-4">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card shadow-elegant p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm">Cookies et confidentialité</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nous utilisons uniquement des cookies nécessaires au fonctionnement (connexion, sécurité, langue et thème).
              Aucun outil publicitaire n'est actif.{" "}
              <Link to="/legal/$slug" params={{ slug: "cookies" }} className="underline hover:text-primary">
                Politique de cookies
              </Link>
              {" · "}
              <Link to="/legal/$slug" params={{ slug: "confidentialite" }} className="underline hover:text-primary">
                Confidentialité
              </Link>
            </p>

            {custom && (
              <div className="mt-3 space-y-2.5 rounded-lg border bg-muted/40 p-3">
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
                    <p className="text-[11px] text-muted-foreground">Non utilisée actuellement.</p>
                  </div>
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="bg-gradient-primary" onClick={() => decide({ preferences: true, analytics: true })}>
                Accepter
              </Button>
              <Button size="sm" variant="outline" onClick={() => decide({ preferences: false, analytics: false })}>
                Refuser
              </Button>
              {!custom ? (
                <Button size="sm" variant="ghost" onClick={() => setCustom(true)}>
                  Personnaliser
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => decide({ preferences, analytics })}>
                  Enregistrer mes choix
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
