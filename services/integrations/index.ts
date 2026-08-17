import "server-only";

import { createClient } from "@/lib/supabase/server";
import { integrationCatalog } from "@/services/integrations/catalog";
import { isCredentialVaultConfigured } from "@/services/integrations/crypto";
import type { IntegrationProvider } from "@/services/integrations/credentials";
import type { Json, Tables } from "@/types/database";

export type IntegrationCardData = {
  connectionId: string | null;
  provider: IntegrationProvider;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  help: (typeof integrationCatalog)[number]["help"];
  status: Tables<"integration_connections">["status"];
  statusLabel: string;
  externalAccountId: string | null;
  config: Record<string, Json | undefined>;
  secretHint: string | null;
  lastSyncedAt: string | null;
  lastTestedAt: string | null;
  lastEventAt: string | null;
  lastErrorCode: string | null;
  diagnosticId: string | null;
  checklist: { label: string; done: boolean }[];
};

const statusLabels: Record<IntegrationCardData["status"], string> = {
  disconnected: "Não configurada",
  incomplete: "Configuração incompleta",
  pending: "Aguardando teste",
  connecting: "Conectando",
  connected: "Conectada",
  attention: "Atenção necessária",
  expired: "Token expirado",
  error: "Erro na conexão",
  revoked: "Acesso revogado",
};

function asRecord(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function buildChecklist(
  provider: IntegrationProvider,
  connection: Tables<"integration_connections"> | undefined,
  hasCredential: boolean,
) {
  const tested = Boolean(connection?.last_tested_at);
  const connected = connection?.status === "connected";
  if (provider === "google_calendar") {
    return [
      { label: "Conta autorizada", done: hasCredential },
      {
        label: "Calendário selecionado",
        done: Boolean(asRecord(connection?.config ?? {}).calendar_id),
      },
      { label: "Teste realizado", done: tested },
      {
        label: "Sincronização ativada",
        done:
          connected && asRecord(connection?.config ?? {}).sync_enabled === true,
      },
    ];
  }
  if (provider === "whatsapp") {
    const config = asRecord(connection?.config ?? {});
    const embedded = config.onboarding_method === "meta_embedded_signup";
    return [
      {
        label: embedded ? "Conta Meta autorizada" : "Credenciais protegidas",
        done: hasCredential,
      },
      { label: "Número validado", done: tested && connected },
      {
        label: "Webhook ativado",
        done:
          config.webhook_subscribed === true ||
          Boolean(connection?.last_event_at),
      },
      {
        label: "Primeiro evento recebido",
        done: Boolean(connection?.last_event_at),
      },
    ];
  }
  if (provider === "openai") {
    return [
      {
        label: "Chave protegida",
        done: hasCredential || Boolean(process.env.OPENAI_API_KEY),
      },
      {
        label: "Modelo escolhido",
        done: Boolean(asRecord(connection?.config ?? {}).model),
      },
      { label: "Teste realizado", done: tested },
      { label: "Qualificação disponível", done: connected },
    ];
  }
  return [
    { label: "Token protegido", done: hasCredential },
    {
      label: "Conta identificada",
      done: Boolean(connection?.external_account_id),
    },
    { label: "Teste realizado", done: tested },
    { label: "Sincronização disponível", done: connected },
  ];
}

export async function getIntegrationCenter(organizationId: string) {
  const supabase = await createClient();
  const [connectionsResult, credentialsResult] = await Promise.all([
    supabase
      .from("integration_connections")
      .select("*")
      .eq("organization_id", organizationId),
    supabase
      .from("integration_credentials")
      .select("provider, secret_hint")
      .eq("organization_id", organizationId),
  ]);
  if (connectionsResult.error) throw connectionsResult.error;
  const migrationReady = !credentialsResult.error;
  if (
    credentialsResult.error &&
    !["42P01", "PGRST205"].includes(credentialsResult.error.code)
  ) {
    throw credentialsResult.error;
  }

  const connections = new Map(
    connectionsResult.data.map((item) => [item.provider, item]),
  );
  const hints = new Map(
    (credentialsResult.data ?? []).map((item) => [
      item.provider,
      item.secret_hint,
    ]),
  );

  const cards: IntegrationCardData[] = integrationCatalog.map((definition) => {
    const connection = connections.get(definition.provider);
    const secretHint = hints.get(definition.provider) ?? null;
    const status = connection?.status ?? "disconnected";
    return {
      ...definition,
      connectionId: connection?.id ?? null,
      status,
      statusLabel: statusLabels[status],
      externalAccountId: connection?.external_account_id ?? null,
      config: asRecord(connection?.config ?? {}),
      secretHint,
      lastSyncedAt: connection?.last_synced_at ?? null,
      lastTestedAt: connection?.last_tested_at ?? null,
      lastEventAt: connection?.last_event_at ?? null,
      lastErrorCode: connection?.last_error_code ?? null,
      diagnosticId: connection?.diagnostic_id ?? null,
      checklist: buildChecklist(
        definition.provider,
        connection,
        Boolean(secretHint),
      ),
    };
  });

  return {
    cards,
    vaultConfigured: isCredentialVaultConfigured(),
    migrationReady,
  };
}
