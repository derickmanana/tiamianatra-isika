import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LessonViewer } from "@/components/LessonViewer";
import { FolderOpen, Layers, FileText, ChevronRight } from "lucide-react";

export function CourseContentTree({ formationId }: { formationId: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [lesson, setLesson] = useState<any | null>(null);

  const { data: tree } = useQuery({
    queryKey: ["student-structure", formationId],
    queryFn: async () => {
      const { data: folders } = await supabase
        .from("course_folders")
        .select("*")
        .eq("formation_id", formationId)
        .order("display_order");
      const folderIds = (folders ?? []).map((f) => f.id);
      const { data: blocks } = folderIds.length
        ? await supabase.from("course_blocks").select("*").in("folder_id", folderIds).order("display_order")
        : { data: [] as any[] };
      const blockIds = (blocks ?? []).map((b) => b.id);
      const { data: lessons } = blockIds.length
        ? await supabase.from("course_lessons").select("*").in("block_id", blockIds).order("display_order")
        : { data: [] as any[] };
      return (folders ?? []).map((f) => ({
        ...f,
        blocks: (blocks ?? [])
          .filter((b) => b.folder_id === f.id)
          .map((b) => ({ ...b, lessons: (lessons ?? []).filter((l) => l.block_id === b.id) })),
      }));
    },
  });

  if (!tree || tree.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Contenu du programme</h2>
      <div className="space-y-2">
        {tree.map((folder: any) => {
          const isOpen = open[folder.id] ?? true;
          return (
            <Card key={folder.id}>
              <CardContent className="py-3">
                <button
                  className="flex items-center gap-2 font-semibold w-full text-left"
                  onClick={() => setOpen((s) => ({ ...s, [folder.id]: !isOpen }))}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate">{folder.title}</span>
                  <Badge variant="secondary">{folder.blocks.length}</Badge>
                </button>
                {isOpen && (
                  <div className="pl-6 mt-2 space-y-2">
                    {folder.blocks.map((block: any) => (
                      <div key={block.id}>
                        <p className="text-sm font-medium flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-accent" /> {block.title}
                        </p>
                        <div className="pl-5 mt-1 space-y-1">
                          {block.lessons.map((l: any) => (
                            <button
                              key={l.id}
                              onClick={() => setLesson(l)}
                              className="flex items-center gap-2 text-sm text-left hover:text-primary w-full"
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate">{l.title}</span>
                            </button>
                          ))}
                          {block.lessons.length === 0 && (
                            <p className="text-xs text-muted-foreground">Bientôt disponible.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <LessonViewer lesson={lesson} open={!!lesson} onOpenChange={(o) => !o && setLesson(null)} />
    </section>
  );
}
