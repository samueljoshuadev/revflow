"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationCredential } from "@/services/integrations/credentials";
import { requireWorkspace } from "@/services/workspace";

type WhatsAppCredential = { accessToken: string; phoneNumberId: string };

export async function sendWhatsAppMessage(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = z.object({
    conversationId: z.uuid(),
    body: z.string().trim().min(1).max(4096),
  }).safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;
  const returnPath = `/messages?conversation=${parsed.data.conversationId}`;
  const admin = createAdminClient();
  const graphVersion = process.env.META_GRAPH_API_VERSION;
  if (!admin || !graphVersion) redirect(`${returnPath}&error=${encodeURIComponent("O envio ainda não foi ativado pelo responsável da plataforma.")}`);

  const { data: conversation } = await admin.from("conversations").select("id, external_contact_id, opt_out_at").eq("organization_id", organization.id).eq("id", parsed.data.conversationId).maybeSingle();
  if (!conversation || conversation.opt_out_at) redirect(`${returnPath}&error=${encodeURIComponent("Esta conversa não possui permissão para receber mensagens.")}`);
  const { data: lastInbound } = await admin.from("messages").select("sent_at, created_at").eq("organization_id", organization.id).eq("conversation_id", conversation.id).eq("direction", "inbound").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const lastInboundAt = new Date(lastInbound?.sent_at ?? lastInbound?.created_at ?? 0).getTime();
  if (Date.now() - lastInboundAt > 24 * 60 * 60 * 1000) {
    redirect(`${returnPath}&error=${encodeURIComponent("A janela de atendimento terminou. Envie um template aprovado pela Meta.")}`);
  }
  const credential = await getIntegrationCredential<WhatsAppCredential>(organization.id, "whatsapp", admin);
  if (!credential) redirect(`${returnPath}&error=${encodeURIComponent("Reconecte o WhatsApp antes de enviar.")}`);

  const { data: localMessage, error: insertError } = await admin.from("messages").insert({
    organization_id: organization.id,
    conversation_id: conversation.id,
    direction: "outbound",
    status: "queued",
    message_type: "text",
    body: parsed.data.body,
    metadata: {},
  }).select("id").single();
  if (insertError || !localMessage) redirect(`${returnPath}&error=${encodeURIComponent("Não foi possível preparar a mensagem.")}`);

  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${credential.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credential.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: conversation.external_contact_id, type: "text", text: { preview_url: false, body: parsed.data.body } }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`whatsapp_send_http_${response.status}`);
    const result = (await response.json()) as { messages?: Array<{ id?: string }> };
    await admin.from("messages").update({ status: "sent", external_id: result.messages?.[0]?.id ?? null, sent_at: new Date().toISOString() }).eq("organization_id", organization.id).eq("id", localMessage.id);
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "whatsapp_send_failed";
    await admin.from("messages").update({ status: "failed", failed_at: new Date().toISOString(), error_code: code }).eq("organization_id", organization.id).eq("id", localMessage.id);
    redirect(`${returnPath}&error=${encodeURIComponent("A Meta não aceitou o envio. Revise a integração e tente novamente.")}`);
  }
  revalidatePath("/messages");
  redirect(`${returnPath}&message=${encodeURIComponent("Mensagem enviada.")}`);
}
