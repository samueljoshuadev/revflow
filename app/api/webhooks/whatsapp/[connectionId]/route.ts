import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getIntegrationCredential } from "@/services/integrations/credentials";
import {
  getWhatsAppChanges,
  processWhatsAppChanges,
  summarizeWhatsAppChanges,
  verifyWhatsAppSignature,
  type WhatsAppPayload,
} from "@/services/integrations/whatsapp-webhook";

type WhatsAppCredential = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  appSecret: string;
  verifyToken: string;
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
  if (
    !context ||
    mode !== "subscribe" ||
    !token ||
    token !== context.credential.verifyToken
  ) {
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
  if (contentLength > 1_000_000)
    return new NextResponse("Payload muito grande", { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000)
    return new NextResponse("Payload muito grande", { status: 413 });
  const context = await loadContext(connectionId);
  if (!context)
    return new NextResponse("Configuração indisponível", { status: 503 });
  if (
    !verifyWhatsAppSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      context.credential.appSecret,
    )
  ) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  let payload: WhatsAppPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppPayload;
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }
  if (payload.object !== "whatsapp_business_account")
    return NextResponse.json({ received: true });

  const changes = getWhatsAppChanges(payload);
  const summary = summarizeWhatsAppChanges(changes);
  const eventId = createHash("sha256").update(rawBody).digest("hex");
  const { error: eventError } = await context.admin
    .from("webhook_events")
    .insert({
      organization_id: context.organizationId,
      provider: "whatsapp",
      external_event_id: eventId,
      status: "processing",
      payload: {
        connection_id: connectionId,
        message_count: summary.messageCount,
        status_count: summary.statusCount,
      },
      attempts: 1,
    });
  if (eventError?.code === "23505")
    return NextResponse.json({ received: true });
  if (eventError) return new NextResponse("Falha temporária", { status: 503 });

  try {
    await processWhatsAppChanges(
      context.admin,
      context.organizationId,
      changes,
    );
    await Promise.all([
      context.admin
        .from("webhook_events")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
        })
        .eq("provider", "whatsapp")
        .eq("external_event_id", eventId),
      context.admin
        .from("integration_connections")
        .update({
          status: "connected",
          last_event_at: new Date().toISOString(),
          last_error_code: null,
        })
        .eq("id", connectionId)
        .eq("organization_id", context.organizationId),
    ]);
  } catch (error) {
    const code =
      error instanceof Error
        ? error.message.slice(0, 100)
        : "whatsapp_processing_failed";
    await context.admin
      .from("webhook_events")
      .update({ status: "failed", last_error: code })
      .eq("provider", "whatsapp")
      .eq("external_event_id", eventId);
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
  const credential = await getIntegrationCredential<WhatsAppCredential>(
    connection.organization_id,
    "whatsapp",
    admin,
  );
  if (!credential?.appSecret || !credential.verifyToken) return null;
  return {
    admin,
    organizationId: connection.organization_id,
    credential,
  };
}
