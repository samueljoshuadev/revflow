import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { saveIntegrationCredential } from "@/services/integrations/credentials";
import type { GoogleCredential } from "@/services/integrations/google";
import { requireWorkspace } from "@/services/workspace";

const settingsPath = "/settings/integrations";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const fail = (message: string) =>
    NextResponse.redirect(new URL(`${settingsPath}?error=${encodeURIComponent(message)}`, baseUrl));
  const code = request.nextUrl.searchParams.get("code");
  const receivedState = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("orbit_google_oauth_state")?.value;
  const verifier = cookieStore.get("orbit_google_oauth_verifier")?.value;
  const expectedOrganizationId = cookieStore.get("orbit_google_oauth_org")?.value;

  if (providerError) return fail("A autorização do Google foi cancelada.");
  if (!code || !receivedState || !expectedState || receivedState !== expectedState || !verifier) {
    return fail("A autorização perdeu a validade. Inicie a conexão novamente.");
  }

  const { organization, user } = await requireWorkspace();
  if (organization.id !== expectedOrganizationId || !["owner", "admin"].includes(organization.role)) {
    return fail("Não foi possível confirmar a organização desta autorização.");
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return fail("O aplicativo Google está incompleto no servidor.");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("google_token_exchange_failed");
    const token = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
      token_type?: string;
    };
    const calendarsResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=50", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!calendarsResponse.ok) throw new Error("google_calendar_permission_failed");
    const calendars = (await calendarsResponse.json()) as { items?: Array<{ id: string; summary?: string; primary?: boolean }> };
    const selected = calendars.items?.find((item) => item.primary) ?? calendars.items?.[0];
    if (!selected) throw new Error("google_calendar_missing");

    const credential: GoogleCredential = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope ?? null,
      tokenType: token.token_type ?? "Bearer",
    };
    await saveIntegrationCredential(organization.id, "google_calendar", credential, `Conta ${selected.id}`);
    const supabase = await createClient();
    const { error } = await supabase.from("integration_connections").upsert(
      {
        organization_id: organization.id,
        provider: "google_calendar",
        status: "pending",
        external_account_id: selected.id,
        config: {
          calendar_id: selected.id,
          calendar_name: selected.summary ?? selected.id,
          sync_enabled: true,
        },
        last_error_code: null,
        created_by: user.id,
      },
      { onConflict: "organization_id,provider" },
    );
    if (error) throw error;
  } catch (error) {
    const codeValue = error instanceof Error ? error.message : "google_oauth_failed";
    console.error("google_oauth_callback_failed", { code: codeValue.slice(0, 100) });
    return fail("Não foi possível concluir a conexão com o Google. Tente novamente.");
  } finally {
    cookieStore.delete("orbit_google_oauth_state");
    cookieStore.delete("orbit_google_oauth_verifier");
    cookieStore.delete("orbit_google_oauth_org");
  }
  return NextResponse.redirect(new URL(`${settingsPath}?message=${encodeURIComponent("Google autorizado. Faça o teste final da conexão.")}`, baseUrl));
}
