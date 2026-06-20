import { memo, useState } from "react";
import { GraduationCap, Layers, Sparkles, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoverImage } from "@/components/CoverImage";
import { HianatraDialog } from "@/components/HianatraDialog";

type F = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  cover_type?: string | null;
  youtube_url?: string | null;
  price?: number | null;
  level?: string | null;
  modules?: { count: number }[] | { count: number };
};

const LEVEL_LABEL: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };

function FormationCardImpl({ formation }: { formation: F }) {
  const [open, setOpen] = useState(false);
  const modulesCount = Array.isArray(formation.modules) ? formation.modules[0]?.count ?? 0 : (formation.modules as any)?.count ?? 0;
  const price = Number(formation.price ?? 0);
  const isVideo = formation.cover_type === "video" && !!formation.youtube_url;

  return (
    <>
      <article className="group rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-gold/40 shadow-card hover:shadow-elegant transition-shadow flex flex-col">
        <div className="aspect-video relative overflow-hidden bg-muted">
          {/* Static thumbnail only (no iframe per card) for grid perf */}
          <CoverImage
            formation={formation}
            alt={formation.title}
            preferStatic
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Solid linear gradient overlay — no backdrop-filter */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
          {isVideo && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <PlayCircle className="h-12 w-12 text-white/90 drop-shadow-lg" />
            </div>
          )}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            <Badge className="bg-gold text-gold-foreground border-0 shadow gap-1"><Sparkles className="h-3 w-3" /> Premium</Badge>
            {formation.level && <Badge variant="secondary" className="bg-black/70 text-white border-0">{LEVEL_LABEL[formation.level] ?? formation.level}</Badge>}
          </div>
          <div className="absolute bottom-2 left-3 right-3 text-white pointer-events-none">
            <h3 className="font-bold text-base md:text-lg line-clamp-1" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>{formation.title}</h3>
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col gap-3">
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{formation.description}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {modulesCount} modules</span>
            {price > 0 && <span className="font-semibold text-foreground">{price.toLocaleString()} Ar</span>}
          </div>
          <Button onClick={() => setOpen(true)} className="w-full bg-gradient-primary gap-2">
            <GraduationCap className="h-4 w-4" /> Hianatra
          </Button>
        </div>
      </article>
      {open && <HianatraDialog open={open} onOpenChange={setOpen} formation={formation} />}
    </>
  );
}

export const FormationCard = memo(FormationCardImpl);
