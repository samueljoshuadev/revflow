"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  deleteIntegrationCredential,
  getIntegrationCredential,
  type IntegrationProvider,
  saveIntegrationCredential,
} from "@/services/integrations/credentials";
import { getGoogleAccessToken } from "@/services/integrations/google";
import {
  calendlySettingsSchema,
  integrationProviderSchema,
  openAiSettingsSchema,
  whatsappSettingsSchema,
} from "@/services/integrations/schemas";
import { requireWorkspace } from "@/services/workspace";
import type { Json } from "@/types/database";

const returnPath = "/settings/integrations";

function go(kind: "message" | "error", message: string): never {
  redirect(`${returnPath}?${kind}=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const workspace = await requireWorkspace();
  if (!["owner", "admin"].includes(workspace.organization.role)) {
    go("error", "Somente administradores podem alterar integrações.");
  }
  return workspace;
}

async function saveConnection(
  organizationId: string,
  userId: string,
  provider: IntegrationProvider,
  config: Record<string, unknown>,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("integration_connections").upsert(
    {
      organization_id: organizationId,
      provider,
      status: "pending",
      config: config as Json,
      last_error_code: null,
      created_by: userId,
    },
    { onConflict: "organization_id,provider" },
  );
  if (error) throw error;
}

export async function saveOpenAi(formData: FormData) {
  const { organization, user } = await requireAdmin();
  const parsed = openAiSettingsSchema.safeParse({
    apiKey: formData.get("apiKey"),
    model: formData.get("model"),
    monthlyLimit: formData.get("monthlyLimit"),
    automaticQualification: formData.get("automaticQualification") === "on",
  });
  if (!parsed.success)
    go("error", "Revise a chave, o modelo e o limite mensal.");

  try {
    await saveIntegrationCredential(
      organization.id,
      "openai",
      { apiKey: parsed.data.apiKey },
      `••••${parsed.data.apiKey.slice(-4)}`,
    );
    await saveConnection(organization.id, user.id, "openai", {
      model: parsed.data.model,
      monthly_limit: parsed.data.monthlyLimit,
      automatic_qualification: parsed.data.automaticQualification,
    });
  } catch (error) {
    console.error("openai_configuration_failed", {
      code: safeErrorCode(error),
    });
    go("error", configurationErrorMessage(error));
  }
  revalidatePath(returnPath);
  go("message", "Configuração salva. Agora teste a conexão.");
}

export async function saveCalendly(formData: FormData) {
  const { organization, user } = await requireAdmin();
  const parsed = calendlySettingsSchema.safeParse({
    accessToken: formData.get("accessToken"),
  });
  if (!parsed.success) go("error", "O token do Calendly parece incompleto.");
  try {
    await saveIntegrationCredential(
      organization.id,
      "calendly",
      { accessToken: parsed.data.accessToken },
      `••••${parsed.data.accessToken.slice(-4)}`,
    );
    await saveConnection(organization.id, user.id, "calendly", {});
  } catch (error) {
    console.error("calendly_configuration_failed", {
      code: safeErrorCode(error),
    });
    go("error", configurationErrorMessage(error));
  }
  revalidatePath(returnPath);
  go("message", "Token protegido. Faça o teste para confirmar a conta.");
}

export async function saveWhatsApp(formData: FormData) {
  const { organization, user } = await requireAdmin();
  const parsed = whatsappSettingsSchema.safeParse({
    accessToken: formData.get("accessToken"),
    phoneNumberId: formData.get("phoneNumberId"),
    businessAccountId: formData.get("businessAccountId") || undefined,
    appSecret: formData.get("appSecret"),
    verifyToken: formData.get("verifyToken"),
  });
  if (!parsed.success)
    go("error", "Revise os dados copiados do painel da Meta.");
  try {
    await saveIntegrationCredential(
      organization.id,
      "whatsapp",
      parsed.data,
      `Número ••••${parsed.data.phoneNumberId.slice(-4)}`,
    );
    await saveConnection(organization.id, user.id, "whatsapp", {
      phone_number_id_suffix: parsed.data.phoneNumberId.slice(-4),
      business_account_configured: Boolean(parsed.data.businessAccountId),
      onboarding_method: "manual",
      webhook_mode: "connection",
    });
  } catch (error) {
    console.error("whatsapp_configuration_failed", {
      code: safeErrorCode(error),
    });
    go("error", configurationErrorMessage(error));
  }
  revalidatePath(returnPath);
  go("message", "Dados protegidos. Faça o teste para validar o número.");
}

type OpenAiCredential = { apiKey: string };
type CalendlyCredential = { accessToken: string };
type WhatsAppCredential = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  onboardingMethod?: string;
};

export async function testIntegration(formData: FormData) {
  const { organization, user } = await requireAdmin();
  const provider = integrationProviderSchema.safeParse(
    formData.get("provider"),
  );
  if (!provider.success) go("error", "Integração inválida.");

  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id, config")
    .eq("organization_id", organization.id)
    .eq("provider", provider.data)
    .maybeSingle();

  try {
    let externalAccountId: string | null = null;
    if (provider.data === "openai") {
      const stored = await getIntegrationCredential<OpenAiCredential>(
        organization.id,
        "openai",
      );
      const apiKey = stored?.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("openai_key_missing");
      const config = asRecord(connection?.config);
      const model =
        typeof config.model === "string"
          ? config.model
          : (process.env.OPENAI_MODEL ?? "gpt-5.4-nano");
      const response = await fetchWithTimeout(
        `https://api.openai.com/v1/models/${encodeURIComponent(model)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );
      if (!response.ok)
        throw new Error(mapHttpError("openai", response.status));
      externalAccountId = model;
    } else if (provider.data === "calendly") {
      const stored = await getIntegrationCredential<CalendlyCredential>(
        organization.id,
        "calendly",
      );
      if (!stored) throw new Error("calendly_token_missing");
      const response = await fetchWithTimeout(
        "https://api.calendly.com/users/me",
        {
          headers: { Authorization: `Bearer ${stored.accessToken}` },
        },
      );
      if (!response.ok)
        throw new Error(mapHttpError("calendly", response.status));
      const body = (await response.json()) as {
        resource?: { uri?: string; email?: string };
      };
      externalAccountId = body.resource?.email ?? body.resource?.uri ?? null;
    } else if (provider.data === "whatsapp") {
      const stored = await getIntegrationCredential<WhatsAppCredential>(
        organization.id,
        "whatsapp",
      );
      if (!stored) throw new Error("whatsapp_token_missing");
      const graphVersion = process.env.META_GRAPH_API_VERSION;
      if (!graphVersion) throw new Error("meta_graph_version_missing");
      const response = await fetchWithTimeout(
        `https://graph.facebook.com/${graphVersion}/${stored.phoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${stored.accessToken}` } },
      );
      if (!response.ok)
        throw new Error(mapHttpError("whatsapp", response.status));
      externalAccountId = stored.phoneNumberId;
    } else {
      const accessToken = await getGoogleAccessToken(organization.id);
      const response = await fetchWithTimeout(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.ok)
        throw new Error(mapHttpError("google", response.status));
      externalAccountId = "Google Calendar";
    }

    const confirmed = {
      status: "connected" as const,
      external_account_id: externalAccountId,
      last_tested_at: new Date().toISOString(),
      last_error_code: null,
    };
    const { error } = connection
      ? await supabase
          .from("integration_connections")
          .update(confirmed)
          .eq("organization_id", organization.id)
          .eq("provider", provider.data)
      : await supabase.from("integration_connections").insert({
          organization_id: organization.id,
          provider: provider.data,
          ...confirmed,
          config:
            provider.data === "openai"
              ? {
                  model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
                  monthly_limit: 500,
                  automatic_qualification: false,
                }
              : {},
          created_by: user.id,
        });
    if (error) throw error;
  } catch (error) {
    const code = safeErrorCode(error);
    await supabase
      .from("integration_connections")
      .update({
        status: code.includes("expired") ? "expired" : "error",
        last_error_code: code,
      })
      .eq("organization_id", organization.id)
      .eq("provider", provider.data);
    console.error("integration_test_failed", { provider: provider.data, code });
    revalidatePath(returnPath);
    go("error", friendlyError(code));
  }
  revalidatePath(returnPath);
  go("message", "Conexão confirmada com sucesso.");
}

export async function disconnectIntegration(formData: FormData) {
  const { organization } = await requireAdmin();
  const provider = integrationProviderSchema.safeParse(
    formData.get("provider"),
  );
  if (!provider.success) return;
  const supabase = await createClient();
  try {
    await deleteIntegrationCredential(organization.id, provider.data);
    await supabase
      .from("integration_connections")
      .update({
        status: "disconnected",
        external_account_id: null,
        credentials_reference: null,
        config: {},
        last_error_code: null,
        last_synced_at: null,
        last_tested_at: null,
        last_event_at: null,
      })
      .eq("organization_id", organization.id)
      .eq("provider", provider.data);
  } catch (error) {
    console.error("integration_disconnect_failed", {
      code: safeErrorCode(error),
    });
    go("error", "Não foi possível desconectar agora. Tente novamente.");
  }
  revalidatePath(returnPath);
  go("message", "Integração desconectada e credencial removida.");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
}

function mapHttpError(provider: string, status: number) {
  if (status === 401) return `${provider}_credential_expired`;
  if (status === 403) return `${provider}_permission_denied`;
  if (status === 429) return `${provider}_rate_limited`;
  return `${provider}_http_${status}`;
}

function safeErrorCode(error: unknown) {
  if (error instanceof Error)
    return error.message.slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, "_");
  return "unknown_error";
}

function configurationErrorMessage(error: unknown) {
  const code = safeErrorCode(error);
  if (code.includes("vault"))
    return "O cofre seguro ainda não foi ativado pelo responsável da plataforma.";
  if (code.includes("relation") || code.includes("column"))
    return "A atualização do banco da Central de Integrações ainda precisa ser aplicada.";
  return "Não foi possível proteger a configuração. Tente novamente.";
}

function friendlyError(code: string) {
  if (code.includes("expired") || code.includes("401"))
    return "A credencial não foi aceita ou expirou. Gere uma nova e tente novamente.";
  if (code.includes("permission"))
    return "A conta não concedeu a permissão necessária. Reconecte e autorize o acesso.";
  if (code.includes("rate_limited"))
    return "O provedor está limitando testes no momento. Aguarde alguns minutos.";
  if (code.includes("missing"))
    return "A configuração ainda está incompleta. Abra Configurar e revise os campos.";
  return "Não conseguimos confirmar a conexão. Revise os dados ou tente novamente mais tarde.";
}
