import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  ContactRound,
  Handshake,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { getDashboardMetrics } from "@/services/dashboard";
import { requireWorkspace } from "@/services/workspace";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const { organization } = await requireWorkspace();
  const metrics = await getDashboardMetrics(organization.id);
  const maxStageCount = Math.max(
    ...metrics.stages.map((stage) => stage.count),
    1,
  );
  const maxSourceCount = Math.max(
    ...metrics.sources.map((source) => source.count),
    1,
  );

  const primaryMetrics = [
    {
      label: "Total de leads",
      value: metrics.total_leads.toLocaleString("pt-BR"),
      helper: `${metrics.new_leads} nos últimos 30 dias`,
      icon: ContactRound,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Valor do pipeline",
      value: formatCurrency(metrics.pipeline_value),
      helper: "oportunidades abertas",
      icon: CircleDollarSign,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Taxa de conversão",
      value: `${metrics.conversion_rate.toLocaleString("pt-BR")}%`,
      helper: `${metrics.won_deals} negócios fechados`,
      icon: TrendingUp,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Ticket médio",
      value: formatCurrency(metrics.average_ticket),
      helper: "sobre negócios ganhos",
      icon: Target,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Performance comercial"
        title={`Olá, ${organization.name}`}
        description="Acompanhe o que está avançando e onde o time precisa agir."
        actions={
          <Link
            href="/pipeline"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50"
          >
            Ver pipeline <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primaryMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="animate-fade-up rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs"
              style={{ animationDelay: `${index * 45}ms` }}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-gray-500">
                  {metric.label}
                </p>
                <span
                  className={`flex size-8 items-center justify-center rounded-lg ${metric.color}`}
                >
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-gray-950">
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] text-gray-400">{metric.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Tarefas abertas",
            value: metrics.open_tasks,
            icon: Sparkles,
          },
          {
            label: "Reuniões (7 dias)",
            value: metrics.upcoming_meetings,
            icon: CalendarDays,
          },
          {
            label: "Clientes ativos",
            value: metrics.active_clients,
            icon: Handshake,
          },
          {
            label: "Projetos ativos",
            value: metrics.active_projects,
            icon: ContactRound,
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-4 py-3.5 shadow-xs"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-lg leading-none font-semibold text-gray-900">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">{metric.label}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Performance por vendedor
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Leads, ganhos e valor aberto por responsável
            </p>
          </div>
          {metrics.overdue_tasks > 0 && (
            <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
              {metrics.overdue_tasks} tarefas atrasadas
            </span>
          )}
        </div>
        {metrics.seller_performance.length === 0 ? (
          <EmptyState label="Nenhum membro encontrado" />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] tracking-wide text-gray-400 uppercase">
                  <th className="pb-3 font-medium">Responsável</th>
                  <th className="pb-3 text-right font-medium">Leads</th>
                  <th className="pb-3 text-right font-medium">Ganhos</th>
                  <th className="pb-3 text-right font-medium">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {metrics.seller_performance.map((seller) => (
                  <tr
                    key={seller.user_id}
                    className="border-b border-gray-50 text-xs"
                  >
                    <td className="py-3 font-medium text-gray-700">
                      {seller.name}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {seller.leads}
                    </td>
                    <td className="py-3 text-right text-gray-500">
                      {seller.won}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-700">
                      {formatCurrency(seller.pipeline_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <article className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Conversão por etapa
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Distribuição atual do pipeline principal
              </p>
            </div>
            <span className="rounded-md bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
              Dados reais
            </span>
          </div>
          <div className="mt-7 space-y-4">
            {metrics.stages.length === 0 ? (
              <EmptyState label="Nenhuma etapa configurada" />
            ) : (
              metrics.stages.map((stage) => (
                <div
                  key={stage.id}
                  className="grid grid-cols-[120px_1fr_32px] items-center gap-3 sm:grid-cols-[160px_1fr_40px]"
                >
                  <p className="truncate text-xs font-medium text-gray-600">
                    {stage.name}
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full min-w-0 rounded-full transition-all"
                      style={{
                        width: `${(stage.count / maxStageCount) * 100}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                  <p className="text-right text-xs font-semibold text-gray-700">
                    {stage.count}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Origem dos leads
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            Principais canais de aquisição
          </p>
          <div className="mt-6 space-y-5">
            {metrics.sources.length === 0 ? (
              <EmptyState label="Sem origens registradas" />
            ) : (
              metrics.sources.map((source, index) => (
                <div key={source.name}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">
                      {source.name}
                    </p>
                    <p className="text-xs font-semibold text-gray-800">
                      {source.count}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${(source.count / maxSourceCount) * 100}%`,
                        opacity: 1 - index * 0.1,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
      {label}
    </div>
  );
}
