import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { Button } from "@/components/ui/button";

type Slide = {
  id: string;
  type: "text" | "image" | "video";
  title: string | null;
  body: string | null;
  media_url: string | null;
  youtube_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

function useSignedMedia(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    if (/^https?:\/\//i.test(path)) { setUrl(path); return; }
    let active = true;
    supabase.storage.from("formation-covers").createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  return url;
}

function SlideMedia({ slide }: { slide: Slide }) {
  const img = useSignedMedia(slide.media_url);
  if (slide.type === "video" && slide.youtube_url) {
    const src = youtubeEmbedUrl(slide.youtube_url, { autoplay: true, mute: true, loop: true, controls: false });
    return (
      <div className="absolute inset-0 overflow-hidden">
        <iframe src={src ?? ""} title={slide.title ?? "slide"} allow="autoplay; encrypted-media"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] border-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
      </div>
    );
  }
  if (slide.type === "image" && img) {
    return (
      <div className="absolute inset-0">
        <img src={img} alt={slide.title ?? ""} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
      </div>
    );
  }
  return <div className="absolute inset-0 bg-gradient-hero" />;
}

export function HeroSlider() {
  const { data: slides } = useQuery({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const { data } = await supabase.from("hero_slides").select("*").eq("is_active", true).order("display_order");
      return (data ?? []) as Slide[];
    },
  });

  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000, stopOnInteraction: false })]);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSel); onSel();
  }, [embla]);

  if (!slides || slides.length === 0) {
    return (
      <section className="relative rounded-3xl overflow-hidden bg-gradient-hero text-white shadow-elegant p-8 md:p-14 mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">M'BossTsika</h1>
        <p className="opacity-90 max-w-xl">Plateforme premium d'apprentissage en ligne — Hianatra amin'ny fomba vaovao.</p>
      </section>
    );
  }

  return (
    <section className="relative rounded-3xl overflow-hidden shadow-elegant mb-8 group">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((s) => (
            <div key={s.id} className="flex-[0_0_100%] min-w-0 relative aspect-[16/9] md:aspect-[21/9]">
              <SlideMedia slide={s} />
              <div className="relative z-10 h-full flex items-end p-6 md:p-12">
                <div className="bg-black/55 border border-white/15 rounded-2xl p-5 md:p-7 max-w-2xl text-white shadow-2xl">
                  {s.title && <h2 className="text-2xl md:text-4xl font-bold mb-2" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{s.title}</h2>}
                  {s.body && <p className="opacity-95 mb-3 text-sm md:text-base line-clamp-3">{s.body}</p>}
                  {s.cta_label && s.cta_url && (
                    <a href={s.cta_url}><Button variant="secondary" size="sm">{s.cta_label}</Button></a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => embla?.scrollPrev()} aria-label="Précédent"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={() => embla?.scrollNext()} aria-label="Suivant"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => embla?.scrollTo(i)} aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${i === selected ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />
        ))}
      </div>
    </section>
  );
}
