import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const redeemAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string; moduleId?: string }) =>
    z.object({ code: z.string().trim().min(3).max(64), moduleId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();

    const { data: row } = await supabaseAdmin
      .from("access_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!row) throw new Error("Code invalide");
    if (!row.is_active) throw new Error("Ce code est désactivé");
    if (row.expires_at && new Date(row.expires_at) < new Date()) throw new Error("Ce code a expiré");
    if (row.max_uses != null && row.uses_count >= row.max_uses) throw new Error("Ce code a atteint sa limite d'utilisation");
    if (data.moduleId && row.module_id !== data.moduleId) throw new Error("Ce code ne correspond pas à ce module");

    const { data: already } = await supabaseAdmin
      .from("access_code_uses")
      .select("id")
      .eq("code_id", row.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (already) throw new Error("Vous avez déjà utilisé ce code");

    const { error: useErr } = await supabaseAdmin
      .from("access_code_uses")
      .insert({ code_id: row.id, user_id: context.userId });
    if (useErr) throw new Error("Impossible d'enregistrer l'utilisation du code");

    await supabaseAdmin
      .from("access_codes")
      .update({ uses_count: row.uses_count + 1 })
      .eq("id", row.id);

    const { data: existing } = await supabaseAdmin
      .from("unlocked_modules")
      .select("id")
      .eq("user_id", context.userId)
      .eq("module_id", row.module_id)
      .maybeSingle();

    if (!existing) {
      await supabaseAdmin
        .from("unlocked_modules")
        .insert({ user_id: context.userId, module_id: row.module_id });
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      type: "general",
      title: "Module débloqué 🔓",
      message: "Un module a été débloqué grâce à votre code d'accès.",
    });

    return { ok: true, moduleId: row.module_id };
  });
