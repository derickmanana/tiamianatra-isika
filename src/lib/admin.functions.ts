import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { paymentId: string; decision: "validated" | "rejected"; comment?: string }) =>
    z.object({
      paymentId: z.string().uuid(),
      decision: z.enum(["validated", "rejected"]),
      comment: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .single();
    if (pErr || !payment) throw new Error("Payment not found");

    await supabaseAdmin
      .from("payments")
      .update({
        status: data.decision,
        admin_comment: data.comment ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.paymentId);

    if (data.decision === "validated") {
      await supabaseAdmin
        .from("unlocked_modules")
        .insert({ user_id: payment.user_id, module_id: payment.module_id, payment_id: payment.id })
        .select();
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.user_id,
        type: "payment_validated",
        title: "Paiement validé",
        message: "Votre paiement a été validé. Le module est maintenant accessible.",
      });
    } else {
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.user_id,
        type: "payment_rejected",
        title: "Paiement refusé",
        message: data.comment ? `Motif : ${data.comment}` : "Votre paiement a été refusé.",
      });
    }
    return { ok: true };
  });

export const toggleUserBlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; block: boolean }) =>
    z.object({ userId: z.string().uuid(), block: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_blocked: data.block }).eq("id", data.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      type: data.block ? "account_blocked" : "account_unblocked",
      title: data.block ? "Compte bloqué" : "Compte débloqué",
      message: data.block ? "Votre compte a été bloqué." : "Votre compte est de nouveau actif.",
    });
    return { ok: true };
  });

export const broadcastMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; body: string; userId?: string }) =>
    z.object({
      subject: z.string().min(1).max(200),
      body: z.string().min(1).max(2000),
      userId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.userId) {
      await supabaseAdmin.from("messages").insert({
        sender_id: context.userId, recipient_id: data.userId,
        subject: data.subject, body: data.body, is_broadcast: false,
      });
      await supabaseAdmin.from("notifications").insert({
        user_id: data.userId, type: "new_message",
        title: "Nouveau message", message: data.subject,
      });
    } else {
      // Broadcast: one message row, plus notifications to all users
      await supabaseAdmin.from("messages").insert({
        sender_id: context.userId, recipient_id: null,
        subject: data.subject, body: data.body, is_broadcast: true,
      });
      const { data: users } = await supabaseAdmin.from("profiles").select("id");
      if (users?.length) {
        await supabaseAdmin.from("notifications").insert(
          users.map((u) => ({
            user_id: u.id, type: "new_message" as const,
            title: "Nouveau message", message: data.subject,
          })),
        );
      }
    }
    return { ok: true };
  });
