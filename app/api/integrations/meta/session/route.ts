import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isCredentialVaultConfigured } from "@/services/integrations/crypto";
import { requireWorkspace } from "@/services/workspace";

export async function GET() {
  const { organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) {
    return NextResponse.json({ error: "meta_admin_required" }, { status: 403 });
  }

  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const configurationId = process.env.META_WHATSAPP_CONFIGURATION_ID?.trim();
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim();
  const webhookVerifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (
    !appId ||
    !/^\d{5,30}$/.test(appId) ||
    !appSecret ||
    !configurationId ||
    !/^\d{5,40}$/.test(configurationId) ||
    !graphVersion ||
    !/^v\d+\.\d+$/.test(graphVersion) ||
    !webhookVerifyToken ||
    !isCredentialVaultConfigured()
  ) {
    return NextResponse.json(
      { error: "meta_platform_not_ready" },
      { status: 503 },
    );
  }

  const sessionToken = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/integrations/meta",
    maxAge: 10 * 60,
  };
  cookieStore.set("revflow_meta_signup_token", sessionToken, options);
  cookieStore.set("revflow_meta_signup_org", organization.id, options);

  return NextResponse.json(
    { appId, configurationId, graphVersion, sessionToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}
