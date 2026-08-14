import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import {
  decryptCredential,
  encryptCredential,
} from "@/services/integrations/crypto";
import type { Database } from "@/types/database";

export type IntegrationProvider =
  | "openai"
  | "google_calendar"
  | "calendly"
  | "whatsapp";

async function resolveClient(client?: SupabaseClient<Database>) {
  return client ?? (await createClient());
}

export async function saveIntegrationCredential(
  organizationId: string,
  provider: IntegrationProvider,
  payload: Record<string, unknown>,
  secretHint: string | null,
  client?: SupabaseClient<Database>,
) {
  const supabase = await resolveClient(client);
  const encrypted = encryptCredential(payload);
  const { error } = await supabase.from("integration_credentials").upsert(
    {
      organization_id: organizationId,
      provider,
      encrypted_payload: encrypted.encryptedPayload,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      key_version: 1,
      secret_hint: secretHint,
    },
    { onConflict: "organization_id,provider" },
  );
  if (error) throw error;
}

export async function getIntegrationCredential<T>(
  organizationId: string,
  provider: IntegrationProvider,
  client?: SupabaseClient<Database>,
) {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("integration_credentials")
    .select("encrypted_payload, iv, auth_tag")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data ? decryptCredential<T>(data) : null;
}

export async function deleteIntegrationCredential(
  organizationId: string,
  provider: IntegrationProvider,
  client?: SupabaseClient<Database>,
) {
  const supabase = await resolveClient(client);
  const { error } = await supabase
    .from("integration_credentials")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", provider);
  if (error) throw error;
}
