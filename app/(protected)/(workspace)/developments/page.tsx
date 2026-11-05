import { Building, MapPin, Plus } from "lucide-react";
import Link from "next/link";

import { Notice } from "@/components/developments/notice";
import { PageHeader } from "@/components/page-header";
import { developmentStageLabels, isOrganizationAdmin } from "@/lib/developments";
import { formatCurrency } from "@/lib/utils";
import { listDevelopments } from "@/services/developments";
import { requireRealEstateWorkspace } from "@/services/workspace";

export const metadata = { title: "Empreendimentos" };

export default async function DevelopmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireRealEstateWorkspace();
  const developments = await listDevelopments(organization.id);
  const isAdmin = isOrganizationAdmin(organization.role);

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Espelho de vendas"
        title="Empreendimentos"
        description="Clique num empreendimento para ver o espelho e a situação de cada unidade."
        actions={
          isAdmin ? (
            <Link href="/developments/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">
              <Plus className="size-4" /> Novo empreendimento
            </Link>
          ) : null
        }
      />
      <Notice error={params.error} message={params.message} />

      {developments.length === 0 ? (
        <section className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8A51B]/35 bg-[#FFF6D8]/40 px-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white text-brand shadow-xs"><Building className="size-5" /></span>
          <h2 className="mt-4 text-sm font-semibold text-gray-900">Nenhum empreendimento cadastrado</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
            {isAdmin
              ? "Cadastre o empreendimento, crie os blocos e gere as unidades para montar o espelho de vendas."
              : "Peça a um administrador para cadastrar o espelho de vendas."}
          </p>
          {isAdmin && <Link href="/developments/new" className="mt-4 text-xs font-semibold text-brand-dark hover:underline">Cadastrar empreendimento</Link>}
        </section>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {developments.map((development) => {
            const { overview } = development;
            const soldShare = overview.total_units ? Math.round(((overview.sold_units + overview.rented_units) / overview.total_units) * 100) : 0;
            return (
              <Link
                key={development.id}
                href={`/developments/${development.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:-translate-y-0.5 hover:border-[#E8A51B]/45 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-wide text-[#A56604] uppercase">{developmentStageLabels[development.stage]}</p>
                    <h2 className="mt-1 truncate text-base font-semibold text-gray-950">{development.name}</h2>
                    {development.developer_name && <p className="truncate text-xs text-gray-500">{development.developer_name}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    {overview.available_units} disponíveis
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-gray-500">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{development.neighborhood ? `${development.neighborhood}, ` : ""}{development.city}</span>
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${soldShare}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <Metric label="Unidades" value={String(overview.total_units)} />
                  <Metric label="Vendidas" value={`${soldShare}%`} />
                  <Metric label="Em proposta" value={String(overview.in_proposal_units)} />
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  VGV total <strong className="text-gray-900">{formatCurrency(overview.total_vgv)}</strong>
                </p>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-1.5">
      <p className="text-gray-400">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  );
}
