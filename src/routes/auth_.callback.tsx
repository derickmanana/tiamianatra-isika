import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "M'BossTsika — Vérification de l'email" },
      { name: "description", content: "Finalisation de la vérification de votre adresse email M'BossTsika." },
      { property: "og:title", content: "M'BossTsika — Vérification de l'email" },
      { property: "og:description", content: "Finalisation de la vérification de votre adresse email M'BossTsika." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthCallback,
});

type Status = "loading" | "success" | "error";

function humanError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("expired")) return "Ce lien de vérification est expiré. Demandez un nouvel email de confirmation.";
  if (m.includes("already") || m.includes("used")) return "Ce lien a déjà été utilisé. Connectez-vous simplement avec votre email et mot de passe.";
  if (m.includes("invalid") || m.includes("otp")) return "Ce lien de vérification est expiré ou invalide. Demandez un nouvel email de confirmation.";
  return msg || "Impossible de finaliser la vérification. Veuillez réessayer.";
}

async function destinationFor(userId: string) {
  const [{ data: adminRole }, { data: partner }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    supabase.from("partners").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  if (adminRole) return "/admin";
  if (partner) return "/partenaire";
  return "/";
}

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Vérification en cours…");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const url = new URL(window.location.href);
      const search = url.searchParams;
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // 1. Erreur renvoyée par Supabase (lien expiré / déjà utilisé)
      const errDesc = search.get("error_description") ?? hash.get("error_description");
      const errCode = search.get("error_code") ?? hash.get("error_code");
      if (errDesc || errCode) {
        if (cancelled) return;
        setStatus("error");
        setMessage(humanError(errDesc ?? errCode ?? ""));
        return;
      }

      try {
        // 2. Flux implicite : tokens dans le fragment
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else if (search.get("code")) {
          // 3. Flux PKCE
          const { error } = await supabase.auth.exchangeCodeForSession(search.get("code")!);
          if (error) throw error;
        } else if (search.get("token_hash") ?? search.get("token")) {
          // 4. Lien avec token_hash (fonctionne aussi depuis un autre appareil)
          const type = (search.get("type") ?? "signup") as "signup" | "email" | "recovery" | "email_change" | "magiclink" | "invite";
          const { error } = await supabase.auth.verifyOtp({
            token_hash: (search.get("token_hash") ?? search.get("token"))!,
            type,
          });
          if (error) throw error;
        }

        // 5. Récupération réelle de l'utilisateur (revalidé côté serveur)
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          if (cancelled) return;
          setStatus("error");
          setMessage(
            "Votre email semble vérifié, mais la session n'a pas pu être récupérée sur cet appareil. Connectez-vous avec votre email et mot de passe.",
          );
          return;
        }

        const dest = await destinationFor(data.user.id);
        if (cancelled) return;
        setStatus("success");
        setMessage("Votre adresse email a été vérifiée avec succès.");
        toast.success("Email vérifié — bienvenue sur M'BossTsika !");
        setTimeout(() => navigate({ to: dest, replace: true }), 1200);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setMessage(humanError(e instanceof Error ? e.message : ""));
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const resend = async () => {
    if (!email || sending) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) toast.error(humanError(error.message));
    else toast.success("Un nouvel email de vérification vient d'être envoyé.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            <span className="bg-gradient-primary bg-clip-text text-transparent">M'BossTsika</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === "loading" && <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />}
          {status === "error" && <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />}
          <p className="text-sm text-muted-foreground">{message}</p>

          {status === "error" && (
            <div className="space-y-3 text-left">
              <Input
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button className="w-full bg-gradient-primary" onClick={resend} disabled={sending || !email}>
                {sending ? "Envoi…" : "Renvoyer l'email de vérification"}
              </Button>
              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full">Retour à la connexion</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
