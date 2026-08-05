import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Upload, Tag, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ClientLayout } from "@/components/ClientLayout";
import { BackButton } from "@/components/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDuration } from "@/lib/youtube";
import { toast } from "sonner";
import { validateAffiliateCode, redeemAffiliateCode } from "@/lib/affiliate.functions";
import { redeemAccessCode } from "@/lib/access-codes.functions";
import { CourseContentTree } from "@/components/CourseContentTree";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/modules/$id")({ component: ModuleDetail });

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function ModuleDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const validateCode = useServerFn(validateAffiliateCode);
  const redeemCode = useServerFn(redeemAffiliateCode);

  const [method, setMethod] = useState<"mvola" | "orange_money" | "binance">("mvola");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [affCode, setAffCode] = useState("");
  const [affApplied, setAffApplied] = useState(false);
  const [useFreeCredit, setUseFreeCredit] = useState(false);

  const { data: mod } = useQuery({
    queryKey: ["module", id],
    queryFn: async () =>
      (await supabase.from("modules").select("*, formations(title)").eq("id", id).single()).data,
  });
  const { data: methods } = useQuery({
    queryKey: ["payment_methods"],
    queryFn: async () =>
      (await supabase.from("payment_methods").select("*").eq("is_active", true)).data ?? [],
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
    queryFn: async () =>
      !!(
        await supabase
          .from("unlocked_modules")
          .select("id")
          .eq("user_id", user!.id)
          .eq("module_id", id)
          .maybeSingle()
      ).data,
  });
  const { data: videos } = useQuery({
    queryKey: ["videos", id],
    enabled: !!unlocked,
    queryFn: async () =>
      (await supabase.from("videos").select("*").eq("module_id", id).order("position")).data ?? [],
  });
  const { data: pendingPayment } = useQuery({
    queryKey: ["pending_payment", user?.id, id],
    enabled: !!user && !unlocked,
    queryFn: async () =>
      (
        await supabase
          .from("payments")
          .select("*")
          .eq("user_id", user!.id)
          .eq("module_id", id)
          .eq("status", "pending")
          .maybeSingle()
      ).data,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile_pay", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("affiliate_bonus_percent, free_modules_credit")
          .eq("id", user!.id)
          .single()
      ).data,
  });
  const { data: discount } = useQuery({
    queryKey: ["discount", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("user_discounts")
          .select("percent")
          .eq("user_id", user!.id)
          .maybeSingle()
      ).data,
  });

  const usdtRate = Number(settings?.usdt_rate_ariary ?? "4450");
  const basePrice = mod?.price_ariary ?? 0;
  const totalDiscountPct = useMemo(() => {
    let p = Number(discount?.percent ?? 0) + Number(profile?.affiliate_bonus_percent ?? 0);
    if (affApplied) p += 5;
    return Math.min(100, p);
  }, [discount, profile, affApplied]);
  const finalPrice = Math.max(0, Math.round(basePrice * (1 - totalDiscountPct / 100)));
  const usdtAmount = Math.round((finalPrice / usdtRate) * 100) / 100;
  const currentMethod = methods?.find((m) => m.method === method);
  const hasFreeCredit = (profile?.free_modules_credit ?? 0) > 0;

  const handleApplyCode = async () => {
    if (!affCode.trim()) return;
    try {
      const res = await validateCode({ data: { code: affCode.trim() } });
      if (res.valid) {
        setAffApplied(true);
        toast.success(t("affiliate.applied"));
      } else {
        toast.error(t("affiliate.invalid"));
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !mod) return;

    // Use free credit: directly unlock the module
    if (useFreeCredit && hasFreeCredit) {
      setSubmitting(true);
      const { error: e1 } = await supabase
        .from("unlocked_modules")
        .insert({ user_id: user.id, module_id: id });
      if (!e1) {
        await supabase
          .from("profiles")
          .update({ free_modules_credit: (profile!.free_modules_credit ?? 1) - 1 })
          .eq("id", user.id);
        toast.success(t("payment.payment_sent"));
        window.location.reload();
      } else toast.error(e1.message);
      setSubmitting(false);
      return;
    }

    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return toast.error("Format non accepté");
    if (file.size > 5 * 1024 * 1024) return toast.error("Fichier trop volumineux (max 5 Mo)");

    setSubmitting(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) {
      setSubmitting(false);
      return toast.error(upErr.message);
    }
    const { data: inserted, error: insErr } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        module_id: id,
        amount_ariary: finalPrice,
        amount_usdt: usdtAmount,
        method,
        proof_url: path,
        status: "pending",
      })
      .select()
      .single();

    if (insErr) {
      setSubmitting(false);
      return toast.error(insErr.message);
    }

    if (affApplied && inserted) {
      try {
        await redeemCode({ data: { code: affCode.trim(), paymentId: inserted.id } });
      } catch {
        /* non-blocking */
      }
    }

    // Notification: preuve de paiement envoyée
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Preuve de paiement reçue",
      message: "Votre preuve de paiement a bien été reçue. Notre équipe est en cours de vérification.",
      type: "general",
    });

    setSubmitting(false);
    toast.success(t("payment.payment_sent"));
    setFile(null);
  };

  return (
    <ClientLayout>
      <BackButton />
      {mod && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">{mod.formations?.title}</p>
          <h1 className="text-2xl font-bold">
            {t("module.order", { n: mod.display_order })} — {mod.title}
          </h1>
          <p className="text-muted-foreground mt-1">{mod.description}</p>
        </div>
      )}

      {unlocked ? (
        <div className="space-y-4">
          {mod?.formation_id && <CourseContentTree formationId={mod.formation_id} />}
          {!videos || videos.length === 0 ? (
            <p className="text-muted-foreground">{t("module.no_videos")}</p>
          ) : (
            <>
              <div className="aspect-video rounded-xl overflow-hidden shadow-elegant bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${videos[0].youtube_video_id}`}
                  title={videos[0].title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <h2 className="text-lg font-semibold mt-6">
                {t("module.videos_count", { count: videos.length })}
              </h2>
              <div className="grid gap-2 md:grid-cols-2">
                {videos.map((v, i) => (
                  <a
                    key={v.id}
                    href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="relative w-32 aspect-video rounded overflow-hidden shrink-0 bg-muted">
                      {v.thumbnail_url && (
                        <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2">
                        {i + 1}. {v.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDuration(v.duration_seconds ?? 0)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      ) : pendingPayment ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("payment.payment_sent")}
          </CardContent>
        </Card>
      ) : (
        mod && (
          <>
          <AccessCodeUnlock moduleId={id} />
          <Card className="shadow-elegant overflow-hidden mt-4">
            <div className="h-1.5 bg-gradient-gold" />
            <CardHeader>
              <CardTitle>{t("payment.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("payment.rate", { rate: usdtRate.toLocaleString() })}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex gap-6 flex-wrap items-end">
                  <div>
                    <Label>{t("payment.amount_ar")}</Label>
                    {totalDiscountPct > 0 && (
                      <p className="text-sm text-muted-foreground line-through">
                        {basePrice.toLocaleString()} Ar
                      </p>
                    )}
                    <p className="text-2xl font-bold text-primary">
                      {finalPrice.toLocaleString()} Ar
                    </p>
                  </div>
                  <div>
                    <Label>{t("payment.amount_usdt")}</Label>
                    <p className="text-2xl font-bold text-gold">{usdtAmount} USDT</p>
                  </div>
                  {totalDiscountPct > 0 && (
                    <Badge className="bg-gold text-gold-foreground gap-1">
                      <Tag className="h-3 w-3" /> −{totalDiscountPct}%
                    </Badge>
                  )}
                </div>

                {hasFreeCredit && (
                  <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gold/50 bg-gradient-to-r from-card to-accent/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useFreeCredit}
                      onChange={(e) => setUseFreeCredit(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Gift className="h-5 w-5 text-gold" />
                    <span className="text-sm font-medium flex-1">
                      Utiliser 1 module gratuit ({profile?.free_modules_credit} disponible{(profile?.free_modules_credit ?? 0) > 1 ? "s" : ""})
                    </span>
                  </label>
                )}

                {!useFreeCredit && (
                  <>
                    <div>
                      <Label className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-gold" />
                        {t("affiliate.have_code")}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={affCode}
                          onChange={(e) => {
                            setAffCode(e.target.value.toUpperCase());
                            setAffApplied(false);
                          }}
                          placeholder={t("affiliate.code_placeholder")}
                          disabled={affApplied}
                          className="font-mono uppercase"
                          maxLength={16}
                        />
                        <Button
                          type="button"
                          variant={affApplied ? "secondary" : "outline"}
                          onClick={handleApplyCode}
                          disabled={!affCode.trim() || affApplied}
                        >
                          {affApplied ? "✓" : t("affiliate.apply")}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">{t("payment.choose_method")}</Label>
                      <RadioGroup
                        value={method}
                        onValueChange={(v) => setMethod(v as "mvola" | "orange_money" | "binance")}
                        className="grid gap-2"
                      >
                        {(["mvola", "orange_money", "binance"] as const).map((mk) => (
                          <label
                            key={mk}
                            className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted"
                          >
                            <RadioGroupItem value={mk} id={mk} />
                            <span className="font-medium">{t(`payment.method_${mk}`)}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    {currentMethod && (
                      <div className="rounded-lg bg-muted p-4 text-sm">
                        <p className="text-muted-foreground">{t("payment.send_to")}</p>
                        <p className="font-mono text-lg font-bold mt-1">
                          {currentMethod.account_number}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("payment.holder")}: {currentMethod.account_holder}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label>{t("payment.upload_proof")}</Label>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("payment.accepted_formats")}
                      </p>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={(!useFreeCredit && !file) || submitting}
                  className="w-full bg-gradient-primary gap-2"
                >
                  <Upload className="h-4 w-4" /> {t("payment.submit_payment")}
                </Button>
              </form>
            </CardContent>
          </Card>
          </>
        )
      )}
    </ClientLayout>
  );
}

function AccessCodeUnlock({ moduleId }: { moduleId: string }) {
  const redeem = useServerFn(redeemAccessCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await redeem({ data: { code: code.trim(), moduleId } });
      toast.success("Module débloqué avec votre code !");
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || "Code invalide");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-gold/40">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-gold" /> Débloquer avec un code d'accès
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vous avez reçu un code de l'administration ? Saisissez-le pour accéder immédiatement à ce module.
        </p>
      </CardHeader>
      <CardContent className="flex gap-2 flex-wrap">
        <Input
          className="flex-1 min-w-[180px] font-mono uppercase"
          placeholder="EX : A1B2C3D4E5"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Button onClick={submit} disabled={busy || !code.trim()}>
          {busy ? "Vérification…" : "Débloquer"}
        </Button>
      </CardContent>
    </Card>
  );
}
