import { Link } from "@tanstack/react-router";

const LINKS: { slug: string; label: string }[] = [
  { slug: "cgu", label: "Conditions d'utilisation" },
  { slug: "cgv", label: "Conditions de vente" },
  { slug: "confidentialite", label: "Confidentialité" },
  { slug: "cookies", label: "Cookies" },
  { slug: "mentions-legales", label: "Mentions légales" },
  { slug: "contact-donnees", label: "Contact" },
];

export function LegalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t bg-muted/30 ${compact ? "py-4" : "py-8"} mt-8`}>
      <div className="container mx-auto px-4">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {LINKS.map((l) => (
            <Link
              key={l.slug}
              to="/legal/$slug"
              params={{ slug: l.slug }}
              className="hover:text-primary hover:underline transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link to="/legal" className="hover:text-primary hover:underline transition-colors">
            Tous les documents
          </Link>
        </nav>
        {!compact && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground/80">
            © {new Date().getFullYear()} M'BossTsika ECOSYSTEM — Plateforme de formation en ligne.
          </p>
        )}
      </div>
    </footer>
  );
}
