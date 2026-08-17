import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type WhatsAppChange = {
  field?: string;
  value?: {
    metadata?: {
      display_phone_number?: string;
      phone_number_id?: string;
    };
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
};

export type WhatsAppPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: WhatsAppChange[];
  }>;
};

export function verifyWhatsAppSignature(
  body: string,
  received: string | null,
  appSecret: string,
) {
  if (!received?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function getWhatsAppChanges(payload: WhatsAppPayload) {
  return payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
}

export async function processWhatsAppChanges(
  admin: SupabaseClient<Database>,
  organizationId: string,
  changes: WhatsAppChange[],
) {
  const { data: leads } = await admin
    .from("leads")
    .select("id, phone")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .limit(500);
  const leadByPhone = new Map(
    (leads ?? [])
      .filter((lead) => lead.phone)
      .map((lead) => [normalizePhone(lead.phone ?? ""), lead.id]),
  );

  for (const change of changes) {
    const value = change.value;
    for (const status of value?.statuses ?? []) {
      if (!status.id) continue;
      const mapped = mapMessageStatus(status.status);
      if (!mapped) continue;
      const timestamp = providerTimestamp(status.timestamp);
      await admin
        .from("messages")
        .update({
          status: mapped,
          delivered_at: mapped === "delivered" ? timestamp : undefined,
          read_at: mapped === "read" ? timestamp : undefined,
          failed_at: mapped === "failed" ? timestamp : undefined,
          error_code:
            mapped === "failed"
              ? String(status.errors?.[0]?.code ?? "provider_failed")
              : null,
        })
        .eq("organization_id", organizationId)
        .eq("external_id", status.id);
    }

    for (const message of value?.messages ?? []) {
      const phone = normalizePhone(message.from ?? "");
      const leadId = leadByPhone.get(phone);
      if (!message.id || !phone || !leadId) continue;
      const contact = value?.contacts?.find(
        (item) => normalizePhone(item.wa_id ?? "") === phone,
      );
      const { data: conversation, error } = await admin
        .from("conversations")
        .upsert(
          {
            organization_id: organizationId,
            lead_id: leadId,
            provider: "whatsapp",
            external_contact_id: phone,
            contact_name: contact?.profile?.name ?? null,
            status: "open",
            last_message_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,provider,external_contact_id" },
        )
        .select("id")
        .single();
      if (error || !conversation)
        throw new Error("whatsapp_conversation_failed");

      const { error: messageError } = await admin.from("messages").upsert(
        {
          organization_id: organizationId,
          conversation_id: conversation.id,
          direction: "inbound",
          status: "received",
          external_id: message.id,
          message_type: message.type ?? "unknown",
          body:
            message.type === "text"
              ? (message.text?.body?.slice(0, 10_000) ?? null)
              : null,
          sent_at: providerTimestamp(message.timestamp),
          metadata: {},
        },
        { onConflict: "organization_id,external_id" },
      );
      if (messageError) throw new Error("whatsapp_message_failed");
    }
  }
}

export function summarizeWhatsAppChanges(changes: WhatsAppChange[]) {
  return {
    messageCount: changes.reduce(
      (total, change) => total + (change.value?.messages?.length ?? 0),
      0,
    ),
    statusCount: changes.reduce(
      (total, change) => total + (change.value?.statuses?.length ?? 0),
      0,
    ),
  };
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-15);
}

function providerTimestamp(value?: string) {
  return value
    ? new Date(Number(value) * 1000).toISOString()
    : new Date().toISOString();
}

function mapMessageStatus(value?: string) {
  if (value === "read") return "read" as const;
  if (value === "delivered") return "delivered" as const;
  if (value === "sent") return "sent" as const;
  if (value === "failed") return "failed" as const;
  return null;
}
