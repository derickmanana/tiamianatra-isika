import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  FileText,
  FileType2,
  Lock,
  PlayCircle,
  CheckCircle2,
  Hourglass,
  Layers,
  Folder,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LessonPlayer } from "@/components/learning/LessonPlayer";
import { detectLessonContent, lessonTypeLabel, type LessonLike } from "@/lib/lesson-content";
import { toast } from "sonner";

type Lesson = LessonLike & { block_id: string; display_order: number };
type Block = { id: string; title: string; display_order: number; lessons: Lesson[] };
type Folder = { id: string; title: string; display_order: number; blocks: Block[] };

function KindIcon({ lesson }: { lesson: Lesson }) {
  const kind = detectLessonContent(lesson).kind;
  if (kind === "youtube" || kind === "gdrive")
    return <PlayCircle className="h-4 w-4 shrink-0 text-primary" />;
  if (kind === "gdoc") return <FileType2 className="h-4 w-4 shrink-0 text-accent" />;
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}


export function ModuleLearningView({
  formationId,
  title,
  description,
}: {
  formationId: string;
  title?: string | null;
  description?: string | null;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({});
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const { data: tree } = useQuery({
    queryKey: ["learning-tree", formationId],
    queryFn: async (): Promise<Folder[]> => {
      const { data: folders } = await supabase
        .from("course_folders")
        .select("id, title, display_order")
        .eq("formation_id", formationId)
        .order("display_order");
      const folderIds = (folders ?? []).map((f) => f.id);
      const blocks = folderIds.length
        ? ((
            await supabase
              .from("course_blocks")
              .select("id, title, display_order, folder_id")
              .in("folder_id", folderIds)
              .order("display_order")
          ).data ?? [])
        : [];
      const blockIds = blocks.map((b) => b.id);
      const lessons = blockIds.length
        ? ((
            await supabase
              .from("course_lessons")
              .select("id, title, description, external_url, files, display_order, block_id")
              .in("block_id", blockIds)
              .order("display_order")
          ).data ?? [])
        : [];
      return (folders ?? []).map((f) => ({
        ...f,
        blocks: blocks
          .filter((b) => b.folder_id === f.id)
          .map((b) => ({
            id: b.id,
            title: b.title,
            display_order: b.display_order,
            lessons: (lessons as any[]).filter((l) => l.block_id === b.id) as Lesson[],
          })),
      }));
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", user?.id, formationId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, status")
        .eq("user_id", user!.id);
      const map: Record<string, "in_progress" | "completed"> = {};
      (data ?? []).forEach((r) => (map[r.lesson_id] = r.status as any));
      return map;
    },
  });

  const flat = useMemo(
    () => (tree ?? []).flatMap((f) => f.blocks.flatMap((b) => b.lessons)),
    [tree],
  );
  const done = useMemo(
    () => flat.filter((l) => progress?.[l.id] === "completed").length,
    [flat, progress],
  );
  const percent = flat.length ? Math.round((done / flat.length) * 100) : 0;
  const totalBlocks = (tree ?? []).reduce((n, f) => n + f.blocks.length, 0);

  const unlockedIndex = useMemo(() => {
    let i = 0;
    while (i < flat.length && progress?.[flat[i]!.id] === "completed") i++;
    return i;
  }, [flat, progress]);

  const isUnlocked = (lessonId: string) => {
    const idx = flat.findIndex((l) => l.id === lessonId);
    return idx <= unlockedIndex;
  };

  const activeInfo = useMemo(() => {
    if (!activeLesson) return null;
    for (const f of tree ?? [])
      for (const b of f.blocks) {
        const lesson = b.lessons.find((l) => l.id === activeLesson);
        if (lesson) return { lesson, blockTitle: b.title };
      }
    return null;
  }, [activeLesson, tree]);


  const markStatus = async (lessonId: string, status: "in_progress" | "completed") => {
    if (!user) return;
    if (progress?.[lessonId] === "completed" && status === "completed") return;
    setSaving(lessonId);
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,lesson_id" },
    );
    setSaving(null);
    if (error) {
      toast.error("Progression non enregistrée. Réessayez.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["lesson-progress", user.id, formationId] });
    if (status === "completed") toast.success("Leçon terminée ✅");
  };

  const openLesson = (lesson: Lesson) => {
    if (!isUnlocked(lesson.id)) {
      toast.info("Terminez la leçon précédente pour débloquer celle-ci.");
      return;
    }
    setActiveLesson(lesson.id);
    if (!progress?.[lesson.id]) void markStatus(lesson.id, "in_progress");
  };

  if (!tree || tree.length === 0) return null;

  return (
    <section className="space-y-4">
      <Card className="overflow-hidden shadow-elegant">
        <div className="h-1.5 bg-gradient-primary" />
        <CardContent className="space-y-3 py-5">
          {title && <h2 className="text-xl font-bold leading-tight">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <Folder className="h-3 w-3" /> {tree.length} dossier{tree.length > 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Layers className="h-3 w-3" /> {totalBlocks} bloc{totalBlocks > 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" /> {flat.length} leçon{flat.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-semibold text-primary">{percent} %</span>
            </div>
            <Progress value={percent} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {tree.map((folder) => (
        <div key={folder.id} className="space-y-2">
          {tree.length > 1 && (
            <p className="px-1 text-sm font-semibold text-muted-foreground">{folder.title}</p>
          )}
          {folder.blocks.map((block, bi) => {
            const blockLessons = block.lessons;
            const blockDone = blockLessons.filter(
              (l) => progress?.[l.id] === "completed",
            ).length;
            const blockLocked =
              blockLessons.length > 0 && !blockLessons.some((l) => isUnlocked(l.id));
            const isOpen = openBlocks[block.id] ?? false;
            return (
              <Card key={block.id} className="overflow-hidden rounded-2xl">
                <button
                  type="button"
                  onClick={() => setOpenBlocks((s) => ({ ...s, [block.id]: !isOpen }))}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      blockLocked
                        ? "bg-muted text-muted-foreground"
                        : blockDone === blockLessons.length && blockLessons.length > 0
                          ? "bg-primary/15 text-primary"
                          : "bg-gradient-primary text-primary-foreground",
                    )}
                  >
                    {blockLocked ? <Lock className="h-4 w-4" /> : bi + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{block.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {blockDone}/{blockLessons.length} leçon
                      {blockLessons.length > 1 ? "s" : ""} terminée
                      {blockDone > 1 ? "s" : ""}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>

                {isOpen && (
                  <CardContent className="space-y-2 border-t bg-muted/20 p-3 sm:p-4">
                    {blockLessons.length === 0 && (
                      <p className="text-sm text-muted-foreground">Bientôt disponible.</p>
                    )}
                    {blockLessons.map((lesson) => {
                      const state = progress?.[lesson.id];
                      const locked = !isUnlocked(lesson.id);
                      return (
                        <div
                          key={lesson.id}
                          className={cn(
                            "flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center",
                            locked && "opacity-60",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {locked ? (
                              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <KindIcon lesson={lesson} />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{lesson.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                Type : {lessonTypeLabel(lesson)}
                              </p>
                            </div>
                            {state === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                            ) : state === "in_progress" && !locked ? (
                              <Hourglass className="h-4 w-4 shrink-0 text-gold" />
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            variant={locked ? "outline" : "default"}
                            disabled={locked}
                            onClick={() => openLesson(lesson)}
                            className="w-full sm:w-auto"
                          >
                            {locked ? "Verrouillé" : "Ouvrir"}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ))}

      <Dialog open={!!activeInfo} onOpenChange={(o) => !o && setActiveLesson(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
          {activeInfo && (
            <>
              <DialogHeader className="text-left">
                <DialogDescription className="text-xs">
                  {title ? `${title} · ` : ""}
                  {activeInfo.blockTitle}
                </DialogDescription>
                <DialogTitle className="text-base sm:text-lg">
                  {activeInfo.lesson.title}
                </DialogTitle>
              </DialogHeader>
              <LessonPlayer
                lesson={activeInfo.lesson}
                completed={progress?.[activeInfo.lesson.id] === "completed"}
                saving={saving === activeInfo.lesson.id}
                onComplete={() => void markStatus(activeInfo.lesson.id, "completed")}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );

}
