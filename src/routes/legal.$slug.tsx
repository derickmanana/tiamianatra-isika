import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { List } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { LegalFooter } from "@/components/LegalFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LegalMarkdown, extractHeadings } from "@/components/legal/LegalMarkdown";
import { fillLegalTokens } from "@/lib/legal";
import { usePublishedLegalDocs, useLegalSettings } from "@/lib/legal-queries";

export const Route = createFileRoute("/legal/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Document juridique — M'BossTsika` },
      { name: "description", content: `Document juridique « ${params.slug} » de la plateforme M'BossTsika.` },
      { property: "og:title", content: "Documents juridiques — M'BossTsika" },
      { property: "og:description", content: "Conditions, confidentialité et mentions légales de M'BossTsika." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LegalDocPage,
  errorComponent: () => (
    <div className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
      Ce document n'a pas pu être chargé. <Link to="/legal" className="underline">Voir tous les documents</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-10 text-center text-sm text-muted-foreground">
      Document introuvable. <Link to="/legal" className="underline">Voir tous les documents</Link>
    </div>
  ),
});

function LegalDocPage() {
  const { slug } = Route.useParams();
  const { data: docs, isLoading } = usePublishedLegalDocs();
  const { data: settings } = useLegalSettings();

  const doc = docs?.find((d) => d.slug === slug);
  const content = useMemo(
    () => (doc ? fillLegalTokens(doc.content, settings ?? {}) : ""),
    [doc, settings],
  );
  const headings = useMemo(() => (content ? extractHeadings(content) : []), [content]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
        <BackButton />

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        )}

        {!isLoading && !doc && (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">Ce document n'est pas disponible.</p>
            <Link to="/legal"><Button variant="outline" className="mt-4">Tous les documents</Button></Link>
          </div>
        )}

        {doc && (
          <>
            <header className="mb-5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{doc.title}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-2 text-xs text-muted-foreground">
                <Badge variant="secondary">Version {doc.version}</Badge>
                <span>Dernière mise à jour : {new Date(doc.last_updated).toLocaleDateString("fr-FR")}</span>
              </div>
            </header>

            {headings.length > 3 && (
              <Card className="mb-6 shadow-card">
                <CardContent className="py-4">
                  <p className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <List className="h-4 w-4 text-primary" /> Sommaire
                  </p>
                  <ol className="grid sm:grid-cols-2 gap-y-1 gap-x-4 text-xs text-muted-foreground list-decimal pl-4">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`} className="hover:text-primary hover:underline">{h.text}</a>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card">
              <CardContent className="py-5">
                <LegalMarkdown content={content} />
              </CardContent>
            </Card>

            <p className="text-[11px] text-muted-foreground/80 mt-4">
              Ce document est fourni à titre informatif et doit être vérifié par un professionnel du droit avant toute
              publication officielle.
            </p>

            <div className="mt-6">
              <Link to="/legal"><Button variant="outline" size="sm">← Tous les documents</Button></Link>
            </div>
          </>
        )}
      </main>
      <LegalFooter compact />
    </div>
  );
}
