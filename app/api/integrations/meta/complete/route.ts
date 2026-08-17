import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { saveIntegrationCredential } from "@/services/integrations/credentials";
import { requireWorkspace } from "@/services/workspace";
import type { Json } from "@/types/database";

const completeSchema = z.object({
  code: z.string().trim().min(20).max(4000),
  sessionToken: z.string().regex(/^[A-Za-z0-9_-]{40,100}$/),
  businessAccountId: z.string().regex(/^\d{5,30}$/),
  phoneNumberId: z.string().regex(/^\d{5,30}$/),
});

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type MetaPhone = {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  quality_rating?: string;
};

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) {
    return NextResponse.json(
      { error: "meta_payload_too_large" },
      { status: 413 },
    );
  }

  const cookieStore = await cookies();
  const expectedToken = cookieStore.get("revflow_meta_signup_token")?.value;
  const expectedOrganizationId = cookieStore.get(
    "revflow_meta_signup_org",
  )?.value;
  const clearSession = () => {
    cookieStore.delete("revflow_meta_signup_token");
    cookieStore.delete("revflow_meta_signup_org");
  };

  let input: z.infer<typeof completeSchema>;
  try {
    input = completeSchema.parse(await request.json());
  } catch {
    clearSession();
    return NextResponse.json(
      { error: "meta_invalid_request" },
      { status: 400 },
    );
  }

  if (!expectedToken || !safeEqual(expectedToken, input.sessionToken)) {
    clearSession();
    return NextResponse.json(
      { error: "meta_session_expired" },
      { status: 403 },
    );
  }

  const { organization, user } = await requireWorkspace();
  if (
    organization.id !== expectedOrganizationId ||
    !["owner", "admin"].includes(organization.role)
  ) {
    clearSession();
    return NextResponse.json(
      { error: "meta_organization_mismatch" },
      { status: 403 },
    );
  }

  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim();
  if (
    !appId ||
    !appSecret ||
    !graphVersion ||
    !/^v\d+\.\d+$/.test(graphVersion)
  ) {
    clearSession();
    return NextResponse.json(
      { error: "meta_platform_not_ready" },
      { status: 503 },
    );
  }

  try {
    const token = await exchangeAuthorizationCode({
      appId,
      appSecret,
      graphVersion,
      code: input.code,
    });
    const appSecretProof = createHmac("sha256", appSecret)
      .update(token.accessToken)
      .digest("hex");
    const phone = await validateBusinessPhone({
      graphVersion,
      accessToken: token.accessToken,
      appSecretProof,
      businessAccountId: input.businessAccountId,
      phoneNumberId: input.phoneNumberId,
    });
    await subscribeApplicationToBusinessAccount({
      graphVersion,
      accessToken: token.accessToken,
      appSecretProof,
      businessAccountId: input.businessAccountId,
    });

    await saveIntegrationCredential(
      organization.id,
      "whatsapp",
      {
        accessToken: token.accessToken,
        expiresAt: token.expiresAt,
        tokenType: token.tokenType,
        phoneNumberId: input.phoneNumberId,
        businessAccountId: input.businessAccountId,
        onboardingMethod: "meta_embedded_signup",
      },
      maskPhone(phone.display_phone_number ?? input.phoneNumberId),
    );

    const supabase = await createClient();
    const config: Record<string, Json | undefined> = {
      onboarding_method: "meta_embedded_signup",
      business_account_id: input.businessAccountId,
      display_phone_number: phone.display_phone_number ?? null,
      verified_name: phone.verified_name ?? null,
      quality_rating: phone.quality_rating ?? null,
      webhook_mode: "shared",
      webhook_subscribed: true,
    };
    const { error } = await supabase.from("integration_connections").upsert(
      {
        organization_id: organization.id,
        provider: "whatsapp",
        status: "connected",
        external_account_id: input.phoneNumberId,
        config,
        last_tested_at: new Date().toISOString(),
        last_error_code: null,
        created_by: user.id,
      },
      { onConflict: "organization_id,provider" },
    );
    if (error) throw new Error("meta_connection_persistence_failed");
  } catch (error) {
    const code = safeMetaError(error);
    console.error("meta_embedded_signup_failed", { code });
    const supabase = await createClient();
    await supabase.from("integration_connections").upsert(
      {
        organization_id: organization.id,
        provider: "whatsapp",
        status: "error",
        last_error_code: code,
        created_by: user.id,
      },
      { onConflict: "organization_id,provider" },
    );
    clearSession();
    return NextResponse.json({ error: code }, { status: 502 });
  }

  clearSession();
  return NextResponse.json({ connected: true });
}

async function exchangeAuthorizationCode(input: {
  appId: string;
  appSecret: string;
  graphVersion: string;
  code: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.graphVersion}/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.appId,
        client_secret: input.appSecret,
        code: input.code,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(`meta_token_exchange_http_${response.status}`);
  const body = (await response.json()) as MetaTokenResponse;
  if (!body.access_token) throw new Error("meta_token_missing");
  return {
    accessToken: body.access_token,
    tokenType: body.token_type ?? "bearer",
    expiresAt:
      typeof body.expires_in === "number"
        ? Date.now() + body.expires_in * 1000
        : null,
  };
}

async function validateBusinessPhone(input: {
  graphVersion: string;
  accessToken: string;
  appSecretProof: string;
  businessAccountId: string;
  phoneNumberId: string;
}) {
  const url = new URL(
    `https://graph.facebook.com/${input.graphVersion}/${input.businessAccountId}/phone_numbers`,
  );
  url.searchParams.set(
    "fields",
    "id,display_phone_number,verified_name,quality_rating",
  );
  url.searchParams.set("limit", "100");
  url.searchParams.set("appsecret_proof", input.appSecretProof);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`meta_phone_list_http_${response.status}`);
  const body = (await response.json()) as { data?: MetaPhone[] };
  const phone = body.data?.find((item) => item.id === input.phoneNumberId);
  if (!phone) throw new Error("meta_phone_not_owned_by_business");
  return phone;
}

async function subscribeApplicationToBusinessAccount(input: {
  graphVersion: string;
  accessToken: string;
  appSecretProof: string;
  businessAccountId: string;
}) {
  const url = new URL(
    `https://graph.facebook.com/${input.graphVersion}/${input.businessAccountId}/subscribed_apps`,
  );
  url.searchParams.set("appsecret_proof", input.appSecretProof);
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`meta_webhook_subscription_http_${response.status}`);
  const body = (await response.json()) as { success?: boolean };
  if (body.success !== true)
    throw new Error("meta_webhook_subscription_failed");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function safeMetaError(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, "_")
    : "meta_embedded_signup_failed";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return `WhatsApp ••••${digits.slice(-4)}`;
}
