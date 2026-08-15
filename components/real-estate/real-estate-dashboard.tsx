import {
  ArrowUpRight,
  Building2,
  CalendarCheck2,
  Clock3,
  ContactRound,
  FileSignature,
  KeyRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import type { RealEstateDashboardMetrics } from "@/services/real-estate-dashboard";

export function RealEstateDashboard({
  organizationName,
  metrics,
}: {
  organizationName: string;
  metrics: RealEstateDashboardMetrics;
}) {
  const primary = [
    { label: "Leads recebidos", value: metrics.leads_received, helper: `${metrics.new_leads_30d} nos últimos 30 dias`, icon: ContactRound },
    { label: "Imóveis disponíveis", value: metrics.available_properties, helper: "ativos no portfólio", icon: Building2 },
    { label: "Visitas agendadas", value: metrics.scheduled_visits, helper: `${metrics.completed_visits} realizadas`, icon: CalendarCheck2 },
    { label: "Propostas", value: metrics.proposals, helper: "registradas na operação", icon: FileSignature },
  ];

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Operação imobiliária"
        title={`Olá, ${organizationName}`}
        description="Leads, imóveis, visitas e corretores no mesmo fluxo comercial."
        actions={<Link href="/properties/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">Cadastrar imóvel <ArrowUpRight className="size-4" /></Link>}
      />

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primary.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="animate-fade-up rounded-xl border border-[#E8A51B]/18 bg-white p-5 shadow-xs" style={{ animationDelay: `${index * 45}ms` }}>
              <div className="flex items-start justify-between"><p className="text-xs font-medium text-gray-500">{metric.label}</p><span className="flex size-9 items-center justify-center rounded-xl bg-[#FFF6D8] text-[#C77B08]"><Icon className="size-4" /></span></div>
              <p className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-[#172033]">{metric.value.toLocaleString("pt-BR")}</p>
              <p className="mt-1 text-[11px] text-gray-400">{metric.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-gray-900">Conversão por corretor</h2><p className="mt-1 text-xs text-gray-400">Distribuição real das oportunidades</p></div><UsersRound className="size-5 text-brand" /></div>
          {metrics.broker_conversion.length ? (
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left"><thead><tr className="border-b border-gray-100 text-[10px] tracking-wide text-gray-400 uppercase"><th className="pb-3 font-medium">Corretor</th><th className="pb-3 text-right font-medium">Leads</th><th className="pb-3 text-right font-medium">Ganhos</th><th className="pb-3 text-right font-medium">Conversão</th></tr></thead><tbody>{metrics.broker_conversion.map((broker) => <tr key={broker.user_id} className="border-b border-gray-50 text-xs"><td className="py-3 font-medium text-gray-700">{broker.name}</td><td className="py-3 text-right text-gray-500">{broker.leads}</td><td className="py-3 text-right text-gray-500">{broker.won}</td><td className="py-3 text-right font-semibold text-brand-dark">{broker.conversion_rate}%</td></tr>)}</tbody></table></div>
          ) : <EmptyState text="Nenhum corretor com dados comerciais." />}
        </article>

        <article className="rounded-xl border border-[#E8A51B]/20 bg-[#172033] p-5 text-white shadow-lg sm:p-6">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-[#FFD978] uppercase">Velocidade comercial</p>
          <div className="mt-5 flex items-end gap-3"><Clock3 className="mb-1 size-6 text-[#E8A51B]" /><p className="text-4xl font-semibold tracking-[-0.05em]">{metrics.average_first_response_minutes === null ? "—" : `${metrics.average_first_response_minutes} min`}</p></div>
          <p className="mt-2 text-xs leading-5 text-white/55">Tempo médio até a primeira ação registrada. Quando não há eventos suficientes, o indicador permanece vazio.</p>
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5"><div><KeyRound className="size-4 text-[#FFD978]" /><p className="mt-2 text-2xl font-semibold">{metrics.completed_visits}</p><p className="text-[10px] text-white/45">visitas realizadas</p></div><div><Building2 className="size-4 text-[#FFD978]" /><p className="mt-2 text-2xl font-semibold">{metrics.top_properties.length}</p><p className="text-[10px] text-white/45">imóveis recomendados</p></div></div>
        </article>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6"><h2 className="text-sm font-semibold text-gray-900">Imóveis mais recomendados</h2>{metrics.top_properties.length ? <div className="mt-4 space-y-3">{metrics.top_properties.map((property) => <Link key={property.id} href={`/properties/${property.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 hover:bg-[#FFF6D8]/60"><div className="min-w-0"><p className="text-[10px] font-semibold text-brand-dark">{property.code}</p><p className="truncate text-xs font-medium text-gray-700">{property.title}</p></div><span className="text-xs font-semibold text-gray-800">{property.recommendations}</span></Link>)}</div> : <EmptyState text="Nenhum matching registrado." />}</article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6"><h2 className="text-sm font-semibold text-gray-900">Motivos de perda</h2>{metrics.loss_reasons.length ? <div className="mt-4 space-y-3">{metrics.loss_reasons.map((loss) => <div key={loss.reason} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"><p className="text-xs text-gray-600">{loss.reason}</p><span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">{loss.count}</span></div>)}</div> : <EmptyState text="Nenhum motivo de perda registrado." />}</article>
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="mt-5 flex min-h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-xs text-gray-400">{text}</div>;
}

