import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LessonViewer, type LessonFile } from "@/components/LessonViewer";
import { toast } from "sonner";
import { Plus, Trash2, Edit, FolderOpen, Layers, FileText, ChevronRight, Eye, Upload, X } from "lucide-react";

type LessonDraft = {
  id?: string;
  block_id: string;
  title: string;
  description: string;
  external_url: string;
  display_order: number;
  files: LessonFile[];
};

export function CourseStructureTab() {
  const qc = useQueryClient();
  const [formationId, setFormationId] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);

  const { data: formations } = useQuery({
    queryKey: ["structure-formations"],
    queryFn: async () =>
      (await supabase.from("formations").select("id,title").order("display_order")).data ?? [],
  });

  const fid = formationId || formations?.[0]?.id || "";

  const { data: tree } = useQuery({
    queryKey: ["course-structure", fid],
    enabled: !!fid,
    queryFn: async () => {
      const { data: folders } = await supabase
        .from("course_folders")
        .select("*")
        .eq("formation_id", fid)
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

  const refresh = () => qc.invalidateQueries({ queryKey: ["course-structure"] });

  const addFolder = async () => {
    const title = prompt("Nom du dossier ?");
    if (!title?.trim()) return;
    const { error } = await supabase.from("course_folders").insert({
      formation_id: fid,
      title: title.trim(),
      display_order: (tree?.length ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    toast.success("Dossier créé");
    refresh();
  };

  const renameRow = async (table: "course_folders" | "course_blocks", id: string, current: string) => {
    const title = prompt("Nouveau nom", current);
    if (!title?.trim()) return;
    const { error } = await supabase.from(table).update({ title: title.trim() }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const deleteRow = async (table: "course_folders" | "course_blocks" | "course_lessons", id: string) => {
    if (!confirm("Supprimer cet élément et tout son contenu ?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé");
    refresh();
  };

  const addBlock = async (folderId: string, count: number) => {
    const title = prompt("Nom du bloc ?");
    if (!title?.trim()) return;
    const { error } = await supabase
      .from("course_blocks")
      .insert({ folder_id: folderId, title: title.trim(), display_order: count + 1 });
    if (error) return toast.error(error.message);
    refresh();
  };

  const uploadFiles = async (files: FileList) => {
    if (!lessonDraft) return;
    setUploading(true);
    const added: LessonFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} dépasse 25 Mo`);
        continue;
      }
      const path = `${fid}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("lesson-files").upload(path, file);
      if (error) {
        toast.error(error.message);
        continue;
      }
      added.push({ name: file.name, path, mime: file.type });
    }
    setLessonDraft((d) => (d ? { ...d, files: [...d.files, ...added] } : d));
    setUploading(false);
  };

  const saveLesson = async () => {
    if (!lessonDraft?.title.trim()) return toast.error("Titre obligatoire");
    const payload = {
      block_id: lessonDraft.block_id,
      title: lessonDraft.title.trim(),
      description: lessonDraft.description.trim() || null,
      external_url: lessonDraft.external_url.trim() || null,
      display_order: Number(lessonDraft.display_order) || 1,
      files: lessonDraft.files as any,
    };
    const { error } = lessonDraft.id
      ? await supabase.from("course_lessons").update(payload).eq("id", lessonDraft.id)
      : await supabase.from("course_lessons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Leçon enregistrée");
    setLessonDraft(null);
    refresh();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-sm">Formation :</Label>
        <Select value={fid} onValueChange={setFormationId}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Choisir…" /></SelectTrigger>
          <SelectContent>
            {(formations ?? []).map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={addFolder} disabled={!fid}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau dossier
        </Button>
      </div>

      {fid && (tree?.length ?? 0) === 0 && (
        <div className="text-center text-muted-foreground py-10 border rounded-lg text-sm">
          Aucun dossier. Structure attendue : Formation → Dossier → Bloc → Leçons.
        </div>
      )}

      <div className="space-y-3">
        {tree?.map((folder: any) => {
          const isOpen = openFolders[folder.id] ?? true;
          return (
            <Card key={folder.id}>
              <CardContent className="py-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    className="flex items-center gap-2 font-semibold text-left"
                    onClick={() => setOpenFolders((s) => ({ ...s, [folder.id]: !isOpen }))}
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {folder.title}
                  </button>
                  <Badge variant="secondary">{folder.blocks.length} bloc(s)</Badge>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={() => addBlock(folder.id, folder.blocks.length)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Bloc
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => renameRow("course_folders", folder.id, folder.title)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteRow("course_folders", folder.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {isOpen && (
                  <div className="pl-6 space-y-2">
                    {folder.blocks.map((block: any) => (
                      <div key={block.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Layers className="h-4 w-4 text-accent" />
                          <span className="font-medium">{block.title}</span>
                          <Badge variant="secondary">{block.lessons.length} leçon(s)</Badge>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setLessonDraft({
                                block_id: block.id,
                                title: "",
                                description: "",
                                external_url: "",
                                display_order: block.lessons.length + 1,
                                files: [],
                              })
                            }
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Leçon
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => renameRow("course_blocks", block.id, block.title)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteRow("course_blocks", block.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="pl-5 space-y-1">
                          {block.lessons.map((lesson: any) => (
                            <div key={lesson.id} className="flex items-center gap-2 text-sm">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate flex-1">{lesson.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {(lesson.files?.length ?? 0)} fichier(s)
                              </span>
                              <Button size="icon" variant="ghost" onClick={() => setPreview(lesson)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setLessonDraft({
                                    id: lesson.id,
                                    block_id: lesson.block_id,
                                    title: lesson.title,
                                    description: lesson.description ?? "",
                                    external_url: lesson.external_url ?? "",
                                    display_order: lesson.display_order,
                                    files: (lesson.files ?? []) as LessonFile[],
                                  })
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => deleteRow("course_lessons", lesson.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {block.lessons.length === 0 && (
                            <p className="text-xs text-muted-foreground">Aucune leçon.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {folder.blocks.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucun bloc dans ce dossier.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!lessonDraft} onOpenChange={(o) => !o && setLessonDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{lessonDraft?.id ? "Modifier la leçon" : "Nouvelle leçon"}</DialogTitle>
          </DialogHeader>
          {lessonDraft && (
            <div className="space-y-3">
              <div>
                <Label>Titre *</Label>
                <Input value={lessonDraft.title} onChange={(e) => setLessonDraft({ ...lessonDraft, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={lessonDraft.description} onChange={(e) => setLessonDraft({ ...lessonDraft, description: e.target.value })} />
              </div>
              <div>
                <Label>Lien externe</Label>
                <Input placeholder="https://…" value={lessonDraft.external_url} onChange={(e) => setLessonDraft({ ...lessonDraft, external_url: e.target.value })} />
              </div>
              <div>
                <Label>Ordre</Label>
                <Input type="number" value={lessonDraft.display_order} onChange={(e) => setLessonDraft({ ...lessonDraft, display_order: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Fichiers (PDF, images, documents)</Label>
                <label className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Téléversement…" : "Ajouter des fichiers"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                  />
                </label>
                {lessonDraft.files.map((f) => (
                  <div key={f.path} className="flex items-center gap-2 text-xs border rounded px-2 py-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate flex-1">{f.name}</span>
                    <button
                      onClick={() =>
                        setLessonDraft({ ...lessonDraft, files: lessonDraft.files.filter((x) => x.path !== f.path) })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={saveLesson} disabled={uploading}>Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LessonViewer lesson={preview} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
    </div>
  );
}
