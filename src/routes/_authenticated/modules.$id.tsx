import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDuration } from "@/lib/youtube";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/modules/$id")({ component: ModuleDetail });

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function ModuleDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [method, setMethod] = useState<"mvola" | "orange_money" | "binance">("mvola");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: mod } = useQuery({
    queryKey: ["module", id],
    queryFn: async () => {
      const { data } = await supabase.from("modules").select("*, formations(title)").eq("id", id).single();
      return data;
    },
  });
  const { data: methods } = useQuery({
    queryKey: ["payment_methods"],
    queryFn: async () => (await supabase.from("payment_methods").select("*").eq("is_active", true)).data ?? [],
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data ?? []).forEach((r) => (map[r.key] = r.value));
      return map;
    },
  });
  const { data: unlocked } = useQuery({
    queryKey: ["unlock", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("unlocked_modules").select("id").eq("user_id", user!.id).eq("module_id", id).maybeSingle();
      return !!data;
    },
  });
  const { data: videos } = useQuery({
    queryKey: ["videos", id],
    enabled: !!unlocked,
    queryFn: async () => (await supabase.from("videos").select("*").eq("module_id", id).order("position")).data ?? [],
  });
  const { data: pendingPayment } = useQuery({
    queryKey: ["pending_payment", user?.id, id],
    enabled: !!user && !unlocked,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("user_id", user!.id).eq("module_id", id).eq("status", "pending").maybeSingle();
      return data;
    },
  });

  const usdtRate = Number(settings?.usdt_rate_ariary ?? "4450");
  const usdtAmount = mod ? Math.round((mod.price_ariary / usdtRate) * 100) / 100 : 0;
  const currentMethod = methods?.find((m) => m.method === method);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !mod) return;
    if (!ACCEPTED.includes(file.type)) return toast.error("Format non accepté");
    if (file.size > 5 * 1024 * 1024) return toast.error("Fichier trop volumineux (max 5 Mo)");
    setSubmitting(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) { setSubmitting(false); return toast.error(upErr.message); }
    const { error: insErr } = await supabase.from("payments").insert({
      user_id: user.id, module_id: id, amount_ariary: mod.price_ariary,
      amount_usdt: usdtAmount, method, proof_url: path, status: "pending",
    });
    setSubmitting(false);
    if (insErr) return toast.error(insErr.message);
    toast.success(t("payment.payment_sent"));
    setFile(null);
  };

  return (
    <ClientLayout>
      <BackButton />
      {mod && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{mod.formations?.title}</p>
          <h1 className="text-2xl font-bold">{t("module.order", { n: mod.display_order })} — {mod.title}</h1>
          <p className="text-muted-foreground mt-1">{mod.description}</p>
        </div>
      )}

      {unlocked ? (
        <div className="space-y-4">
          {(!videos || videos.length === 0) ? (
            <p className="text-muted-foreground">{t("module.no_videos")}</p>
          ) : (
            <>
              <div className="aspect-video rounded-xl overflow-hidden shadow-elegant bg-black">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${videos[0].youtube_video_id}`}
                  title={videos[0].title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
              <h2 className="text-lg font-semibold mt-6">{t("module.videos_count", { count: videos.length })}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {videos.map((v, i) => (
                  <a key={v.id} href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`} target="_blank" rel="noreferrer"
                    className="flex gap-3 p-3 rounded-lg border hover:bg-muted transition-colors">
                    <div className="relative w-32 aspect-video rounded overflow-hidden shrink-0 bg-muted">
                      {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2">{i + 1}. {v.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDuration(v.duration_seconds ?? 0)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      ) : pendingPayment ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">{t("payment.payment_sent")}</CardContent></Card>
      ) : mod && (
        <Card>
          <CardHeader>
            <CardTitle>{t("payment.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("payment.rate", { rate: usdtRate.toLocaleString() })}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex gap-6 flex-wrap">
                <div><Label>{t("payment.amount_ar")}</Label><p className="text-2xl font-bold text-primary">{mod.price_ariary.toLocaleString()} Ar</p></div>
                <div><Label>{t("payment.amount_usdt")}</Label><p className="text-2xl font-bold text-accent">{usdtAmount} USDT</p></div>
              </div>

              <div>
                <Label className="mb-2 block">{t("payment.choose_method")}</Label>
                <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="grid gap-2">
                  {(["mvola", "orange_money", "binance"] as const).map((mk) => (
                    <label key={mk} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted">
                      <RadioGroupItem value={mk} id={mk} />
                      <span className="font-medium">{t(`payment.method_${mk}`)}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {currentMethod && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="text-muted-foreground">{t("payment.send_to")}</p>
                  <p className="font-mono text-lg font-bold mt-1">{currentMethod.account_number}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("payment.holder")}: {currentMethod.account_holder}</p>
                </div>
              )}

              <div>
                <Label>{t("payment.upload_proof")}</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground mt-1">{t("payment.accepted_formats")}</p>
              </div>

              <Button type="submit" disabled={!file || submitting} className="w-full bg-gradient-primary gap-2">
                <Upload className="h-4 w-4" /> {t("payment.submit_payment")}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </ClientLayout>
  );
}
