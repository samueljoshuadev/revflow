import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getIntegrationCredential,
  saveIntegrationCredential,
} from "@/services/integrations/credentials";
import type { Database } from "@/types/database";

export type GoogleCredential = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scope: string | null;
  tokenType: string;
};

export async function getGoogleAccessToken(
  organizationId: string,
  client?: SupabaseClient<Database>,
) {
  const credential = await getIntegrationCredential<GoogleCredential>(
    organizationId,
    "google_calendar",
    client,
  );
  if (!credential) throw new Error("google_authorization_missing");
  if (credential.expiresAt > Date.now() + 60_000) return credential.accessToken;
  if (!credential.refreshToken) throw new Error("google_credential_expired");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("google_platform_not_configured");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credential.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("google_credential_expired");
  const body = (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
  const updated: GoogleCredential = {
    accessToken: body.access_token,
    refreshToken: credential.refreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
    scope: body.scope ?? credential.scope,
    tokenType: body.token_type ?? credential.tokenType,
  };
  await saveIntegrationCredential(
    organizationId,
    "google_calendar",
    updated,
    "OAuth Google",
    client,
  );
  return updated.accessToken;
}
