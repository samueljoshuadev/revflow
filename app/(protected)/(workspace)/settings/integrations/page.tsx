import { PlugZap } from "lucide-react";

import { IntegrationCenter } from "@/components/integrations/integration-center";
import { PageHeader } from "@/components/page-header";
import { getIntegrationCenter } from "@/services/integrations";
import { requireWorkspace } from "@/services/workspace";

export const metadata = { title: "Integrações" };

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireWorkspace();
  const center = await getIntegrationCenter(organization.id);
  const canAdmin = ["owner", "admin"].includes(organization.role);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const googleOAuthReady = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      center.vaultConfigured,
  );

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Configuração simples"
        title="Central de Integrações"
        description="Conecte as ferramentas da sua empresa, acompanhe o progresso e resolva pendências em um só lugar."
        actions={<span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600"><PlugZap className="size-4 text-brand" /> {organization.name}</span>}
      />
      {(params.error || params.message) && (
        <p role="status" className={`mt-6 rounded-xl border px-4 py-3 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {params.error ?? params.message}
        </p>
      )}
      {!canAdmin && (
        <p className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Você pode acompanhar o estado das integrações. Somente proprietários e administradores podem alterá-las.</p>
      )}
      <IntegrationCenter
        cards={center.cards}
        canAdmin={canAdmin}
        vaultConfigured={center.vaultConfigured}
        migrationReady={center.migrationReady}
        googleOAuthReady={googleOAuthReady}
        appUrl={appUrl}
      />
    </div>
  );
}
