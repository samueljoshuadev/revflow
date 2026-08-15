import { BarChart3, Building2, CalendarCheck2, ContactRound, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getRealEstateDashboardMetrics } from "@/services/real-estate-dashboard";
import { requireRealEstateWorkspace } from "@/services/workspace";

export const metadata = { title: "Relatórios imobiliários" };

export default async function ReportsPage() {
  const { organization } = await requireRealEstateWorkspace();
  const metrics = await getRealEstateDashboardMetrics(organization.id);
  const cards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: "Leads", value: metrics.leads_received, icon: ContactRound },
    {
      label: "Imóveis disponíveis",
      value: metrics.available_properties,
      icon: Building2,
    },
    {
      label: "Visitas realizadas",
      value: metrics.completed_visits,
      icon: CalendarCheck2,
    },
    {
      label: "Corretores",
      value: metrics.broker_conversion.length,
      icon: UsersRound,
    },
  ];
  return (
    <div className="mx-auto max-w-[1300px] p-4 sm:p-6 lg:p-8">
      <PageHeader eyebrow="Inteligência comercial" title="Relatórios" description="Indicadores calculados com os dados reais da organização ativa." />
      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs"><Icon className="size-5 text-brand" /><p className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#172033]">{value.toLocaleString("pt-BR")}</p><p className="mt-1 text-xs text-gray-500">{label}</p></article>
        ))}
      </section>
      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2"><BarChart3 className="size-5 text-brand" /><h2 className="text-sm font-semibold text-gray-900">Desempenho por corretor</h2></div>
        {metrics.broker_conversion.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-gray-100 text-[10px] tracking-wide text-gray-400 uppercase"><th className="pb-3">Corretor</th><th className="pb-3 text-right">Leads</th><th className="pb-3 text-right">Ganhos</th><th className="pb-3 text-right">Conversão</th></tr></thead><tbody>{metrics.broker_conversion.map((broker) => <tr key={broker.user_id} className="border-b border-gray-50 text-xs"><td className="py-4 font-medium text-gray-800">{broker.name}</td><td className="py-4 text-right text-gray-500">{broker.leads}</td><td className="py-4 text-right text-gray-500">{broker.won}</td><td className="py-4 text-right font-semibold text-brand-dark">{broker.conversion_rate}%</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-lg bg-gray-50 p-8 text-center text-xs text-gray-400">Ainda não existem dados suficientes para este relatório.</p>}
      </section>
    </div>
  );
}
