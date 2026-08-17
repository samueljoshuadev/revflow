import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  processWhatsAppChanges,
  summarizeWhatsAppChanges,
  verifyWhatsAppSignature,
  type WhatsAppPayload,
} from "@/services/integrations/whatsapp-webhook";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (
    mode !== "subscribe" ||
    !token ||
    !expected ||
    !safeEqual(token, expected)
  ) {
    return new NextResponse("Verificação recusada", { status: 403 });
  }
  return new NextResponse(challenge ?? "", { status: 200 });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000)
    return new NextResponse("Payload muito grande", { status: 413 });
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_000_000)
    return new NextResponse("Payload muito grande", { status: 413 });

  const appSecret = process.env.META_APP_SECRET?.trim();
  if (
    !appSecret ||
    !verifyWhatsAppSignature(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      appSecret,
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

  const admin = createAdminClient();
  if (!admin) return new NextResponse("Serviço indisponível", { status: 503 });
  const grouped = groupChangesByPhoneNumber(payload);

  try {
    for (const [phoneNumberId, changes] of grouped) {
      const { data: connection, error } = await admin
        .from("integration_connections")
        .select("id, organization_id")
        .eq("provider", "whatsapp")
        .eq("external_account_id", phoneNumberId)
        .contains("config", { webhook_mode: "shared" })
        .maybeSingle();
      if (error) throw error;
      if (!connection) continue;

      const eventId = createHash("sha256")
        .update(`${phoneNumberId}:${rawBody}`)
        .digest("hex");
      const summary = summarizeWhatsAppChanges(changes);
      const { error: eventError } = await admin.from("webhook_events").insert({
        organization_id: connection.organization_id,
        provider: "whatsapp",
        external_event_id: eventId,
        status: "processing",
        payload: {
          connection_id: connection.id,
          phone_number_id_suffix: phoneNumberId.slice(-4),
          message_count: summary.messageCount,
          status_count: summary.statusCount,
        },
        attempts: 1,
      });
      if (eventError?.code === "23505") continue;
      if (eventError) throw eventError;

      try {
        await processWhatsAppChanges(
          admin,
          connection.organization_id,
          changes,
        );
        await Promise.all([
          admin
            .from("webhook_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
            })
            .eq("provider", "whatsapp")
            .eq("external_event_id", eventId),
          admin
            .from("integration_connections")
            .update({
              status: "connected",
              last_event_at: new Date().toISOString(),
              last_error_code: null,
            })
            .eq("id", connection.id)
            .eq("organization_id", connection.organization_id),
        ]);
      } catch (error) {
        const code =
          error instanceof Error
            ? error.message.slice(0, 100)
            : "whatsapp_processing_failed";
        await admin
          .from("webhook_events")
          .update({ status: "failed", last_error: code })
          .eq("provider", "whatsapp")
          .eq("external_event_id", eventId);
        throw error;
      }
    }
  } catch {
    return new NextResponse("Falha temporária", { status: 503 });
  }

  return NextResponse.json({ received: true });
}

function groupChangesByPhoneNumber(payload: WhatsAppPayload) {
  const grouped = new Map<
    string,
    NonNullable<NonNullable<WhatsAppPayload["entry"]>[number]["changes"]>
  >();
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value?.metadata?.phone_number_id;
      if (!phoneNumberId || !/^\d{5,30}$/.test(phoneNumberId)) continue;
      const current = grouped.get(phoneNumberId) ?? [];
      current.push(change);
      grouped.set(phoneNumberId, current);
    }
  }
  return grouped;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
