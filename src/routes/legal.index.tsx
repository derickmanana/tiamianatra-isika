import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ScrollText, ShieldCheck, Cookie, Building2, RotateCcw, Gavel, Copyright, Mail } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { LegalFooter } from "@/components/LegalFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublishedLegalDocs } from "@/lib/legal-queries";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Documents juridiques et confidentialité — M'BossTsika" },
      { name: "description", content: "Conditions d'utilisation, conditions de vente, politique de confidentialité, cookies et mentions légales de M'BossTsika." },
      { property: "og:title", content: "Documents juridiques — M'BossTsika" },
      { property: "og:description", content: "Consultez les conditions, la politique de confidentialité et les mentions légales de M'BossTsika." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalIndexPage,
});

const ICONS: Record<string, any> = {
  cgu: FileText,
  cgv: ScrollText,
  confidentialite: ShieldCheck,
  cookies: Cookie,
  "mentions-legales": Building2,
  remboursement: RotateCcw,
  "regles-utilisation": Gavel,
  "contenus-droits-auteur": Copyright,
  "contact-donnees": Mail,
};

function LegalIndexPage() {
  const { data: docs, isLoading } = usePublishedLegalDocs();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
        <BackButton />
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documents juridiques et confidentialité</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Retrouvez ici l'ensemble des documents applicables à l'utilisation de M'BossTsika ECOSYSTEM.
          </p>
        </header>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {!isLoading && (docs?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground italic">Aucun document publié pour l'instant.</p>
        )}

        <div className="grid gap-3">
          {(docs ?? []).map((d) => {
            const Icon = ICONS[d.slug] ?? FileText;
            return (
              <Link key={d.id} to="/legal/$slug" params={{ slug: d.slug }}>
                <Card className="shadow-card hover:shadow-elegant transition-shadow hover:border-primary/40">
                  <CardContent className="py-4 flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary grid place-items-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{d.title}</p>
                        <Badge variant="secondary" className="text-[10px]">v{d.version}</Badge>
                      </div>
                      {d.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.summary}</p>}
                      <p className="text-[11px] text-muted-foreground/80 mt-1">
                        Mise à jour : {new Date(d.last_updated).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
      <LegalFooter compact />
    </div>
  );
}
