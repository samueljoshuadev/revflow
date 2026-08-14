import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isCredentialVaultConfigured } from "@/services/integrations/crypto";
import { requireWorkspace } from "@/services/workspace";

export async function GET() {
  const { organization } = await requireWorkspace();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!["owner", "admin"].includes(organization.role)) {
    return NextResponse.redirect(new URL("/settings/integrations?error=Somente+administradores+podem+conectar+o+Google.", baseUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri || !isCredentialVaultConfigured()) {
    return NextResponse.redirect(new URL("/settings/integrations?error=O+aplicativo+Google+ainda+não+foi+preparado+pelo+responsável+da+plataforma.", baseUrl));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/integrations/google",
    maxAge: 10 * 60,
  };
  cookieStore.set("orbit_google_oauth_state", state, cookieOptions);
  cookieStore.set("orbit_google_oauth_verifier", verifier, cookieOptions);
  cookieStore.set("orbit_google_oauth_org", organization.id, cookieOptions);

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
    ].join(" "),
  }).toString();
  return NextResponse.redirect(authorizationUrl);
}
