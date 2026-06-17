import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const randCode = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

export const getOrCreateAffiliateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("affiliate_codes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing && new Date(existing.expires_at) > new Date()) return existing;
    if (existing) {
      const { data: refreshed } = await supabase
        .from("affiliate_codes")
        .update({
          code: randCode(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          uses_count: 0,
        })
        .eq("id", existing.id)
        .select()
        .single();
      return refreshed;
    }
    const { data: created, error } = await supabase
      .from("affiliate_codes")
      .insert({ user_id: userId, code: randCode() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const validateAffiliateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().trim().min(4).max(16) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("affiliate_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!row) return { valid: false as const, reason: "not_found" };
    if (row.user_id === userId) return { valid: false as const, reason: "self" };
    if (new Date(row.expires_at) < new Date()) return { valid: false as const, reason: "expired" };
    return { valid: true as const, codeId: row.id, ownerId: row.user_id, discountPercent: 5 };
  });

export const redeemAffiliateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; paymentId: string }) =>
    z.object({ code: z.string().trim().min(4).max(16), paymentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: codeRow } = await supabaseAdmin
      .from("affiliate_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!codeRow) throw new Error("Code introuvable");
    if (codeRow.user_id === userId) throw new Error("Code personnel");
    if (new Date(codeRow.expires_at) < new Date()) throw new Error("Code expiré");

    await supabaseAdmin.from("affiliate_uses").insert({
      code_id: codeRow.id,
      used_by: userId,
      payment_id: data.paymentId,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newUses = codeRow.uses_count + 1;
    const newTotal = codeRow.total_uses_count + 1;
    const giveFree = newUses >= 10;

    await supabaseAdmin
      .from("affiliate_codes")
      .update({
        uses_count: giveFree ? 0 : newUses,
        total_uses_count: newTotal,
      })
      .eq("id", codeRow.id);

    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("affiliate_bonus_percent, free_modules_credit")
      .eq("id", codeRow.user_id)
      .single();

    const currentBonus = Number(ownerProfile?.affiliate_bonus_percent ?? 0);
    const currentFree = Number(ownerProfile?.free_modules_credit ?? 0);
    await supabaseAdmin
      .from("profiles")
      .update({
        affiliate_bonus_percent: Math.min(100, currentBonus + 10),
        free_modules_credit: giveFree ? currentFree + 1 : currentFree,
      })
      .eq("id", codeRow.user_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: codeRow.user_id,
      type: "general",
      title: giveFree ? "Module gratuit débloqué 🎉" : "Parrainage utilisé",
      message: giveFree
        ? "Vous avez atteint 10 parrainages : un module gratuit vous est crédité."
        : "Un utilisateur a utilisé votre code (+10% de bonus appliqué).",
    });
    return { ok: true, gaveFreeModule: giveFree };
  });

export const setUserDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; percent: number }) =>
    z.object({ userId: z.string().uuid(), percent: z.number().min(0).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_discounts")
      .upsert({ user_id: data.userId, percent: data.percent }, { onConflict: "user_id" });
    return { ok: true };
  });

export const adminGrantFreeModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; moduleId: string }) =>
    z.object({ userId: z.string().uuid(), moduleId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("unlocked_modules")
      .insert({ user_id: data.userId, module_id: data.moduleId });
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: "general",
      title: "Module offert",
      message: "Un module vous a été offert par l'administrateur.",
    });
    return { ok: true };
  });
