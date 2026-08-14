import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationCredential } from "@/services/integrations/credentials";

type WhatsAppCredential = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  appSecret: string;
  verifyToken: string;
};

type WhatsAppPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: Array<{
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          errors?: Array<{ code?: number }>;
        }>;
      };
    }>;
  }>;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await params;
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const context = await loadContext(connectionId);
  if (!context || mode !== "subscribe" || !token || token !== context.credential.verifyToken) {
    return new NextResponse("Verificação recusada", { status: 403 });
  }
  await context.admin
    .from("integration_connections")
    .update({ last_event_at: new Date().toISOString(), last_error_code: null })
    .eq("id", connectionId)
    .eq("organization_id", context.organizationId);
  return new NextResponse(challenge ?? "", { status: 200 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await params;
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return new NextResponse("Payload muito grande", { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000) return new NextResponse("Payload muito grande", { status: 413 });
  const context = await loadContext(connectionId);
  if (!context) return new NextResponse("Configuração indisponível", { status: 503 });
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(rawBody, signature, context.credential.appSecret)) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppPayload;
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }
  if (payload.object !== "whatsapp_business_account") return NextResponse.json({ received: true });

  const eventId = createHash("sha256").update(rawBody).digest("hex");
  const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
  const messageCount = changes.reduce((total, change) => total + (change.value?.messages?.length ?? 0), 0);
  const statusCount = changes.reduce((total, change) => total + (change.value?.statuses?.length ?? 0), 0);
  const { error: eventError } = await context.admin.from("webhook_events").insert({
    organization_id: context.organizationId,
    provider: "whatsapp",
    external_event_id: eventId,
    status: "processing",
    payload: { connection_id: connectionId, message_count: messageCount, status_count: statusCount },
    attempts: 1,
  });
  if (eventError?.code === "23505") return NextResponse.json({ received: true });
  if (eventError) return new NextResponse("Falha temporária", { status: 503 });

  try {
    await processChanges(context, changes);
    await Promise.all([
      context.admin.from("webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("provider", "whatsapp").eq("external_event_id", eventId),
      context.admin.from("integration_connections").update({ status: "connected", last_event_at: new Date().toISOString(), last_error_code: null }).eq("id", connectionId).eq("organization_id", context.organizationId),
    ]);
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "whatsapp_processing_failed";
    await context.admin.from("webhook_events").update({ status: "failed", last_error: code }).eq("provider", "whatsapp").eq("external_event_id", eventId);
    return new NextResponse("Falha temporária", { status: 503 });
  }
  return NextResponse.json({ received: true });
}

async function loadContext(connectionId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(connectionId)) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: connection, error } = await admin
    .from("integration_connections")
    .select("organization_id, provider")
    .eq("id", connectionId)
    .eq("provider", "whatsapp")
    .maybeSingle();
  if (error || !connection) return null;
  const credential = await getIntegrationCredential<WhatsAppCredential>(connection.organization_id, "whatsapp", admin);
  if (!credential) return null;
  return { admin, organizationId: connection.organization_id, credential };
}

function verifySignature(body: string, received: string | null, secret: string) {
  if (!received?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function processChanges(
  context: NonNullable<Awaited<ReturnType<typeof loadContext>>>,
  changes: NonNullable<NonNullable<WhatsAppPayload["entry"]>[number]["changes"]>,
) {
  const { data: leads } = await context.admin
    .from("leads")
    .select("id, phone")
    .eq("organization_id", context.organizationId)
    .is("archived_at", null)
    .limit(500);
  const leadByPhone = new Map((leads ?? []).filter((lead) => lead.phone).map((lead) => [normalizePhone(lead.phone ?? ""), lead.id]));

  for (const change of changes) {
    const value = change.value;
    for (const status of value?.statuses ?? []) {
      if (!status.id) continue;
      const mapped = status.status === "read" ? "read" : status.status === "delivered" ? "delivered" : status.status === "sent" ? "sent" : status.status === "failed" ? "failed" : null;
      if (!mapped) continue;
      const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
      await context.admin.from("messages").update({
        status: mapped,
        delivered_at: mapped === "delivered" ? timestamp : undefined,
        read_at: mapped === "read" ? timestamp : undefined,
        failed_at: mapped === "failed" ? timestamp : undefined,
        error_code: mapped === "failed" ? String(status.errors?.[0]?.code ?? "provider_failed") : null,
      }).eq("organization_id", context.organizationId).eq("external_id", status.id);
    }
    for (const message of value?.messages ?? []) {
      const phone = normalizePhone(message.from ?? "");
      const leadId = leadByPhone.get(phone);
      if (!message.id || !phone || !leadId) continue;
      const contact = value?.contacts?.find((item) => normalizePhone(item.wa_id ?? "") === phone);
      const { data: conversation, error } = await context.admin.from("conversations").upsert({
        organization_id: context.organizationId,
        lead_id: leadId,
        provider: "whatsapp",
        external_contact_id: phone,
        contact_name: contact?.profile?.name ?? null,
        status: "open",
        last_message_at: new Date().toISOString(),
      }, { onConflict: "organization_id,provider,external_contact_id" }).select("id").single();
      if (error || !conversation) throw new Error("whatsapp_conversation_failed");
      const timestamp = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString();
      const { error: messageError } = await context.admin.from("messages").upsert({
        organization_id: context.organizationId,
        conversation_id: conversation.id,
        direction: "inbound",
        status: "received",
        external_id: message.id,
        message_type: message.type ?? "unknown",
        body: message.type === "text" ? message.text?.body?.slice(0, 10_000) ?? null : null,
        sent_at: timestamp,
        metadata: {},
      }, { onConflict: "organization_id,external_id" });
      if (messageError) throw new Error("whatsapp_message_failed");
    }
  }
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-15);
}
