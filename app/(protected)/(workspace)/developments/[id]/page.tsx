import { ArrowLeft, Building, CalendarDays, MapPin, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MirrorGrid, MirrorLegend } from "@/components/developments/mirror-grid";
import { Notice } from "@/components/developments/notice";
import { UnitPanel } from "@/components/developments/unit-panel";
import { developmentStageLabels, isOrganizationAdmin } from "@/lib/developments";
import { formatCurrency } from "@/lib/utils";
import {
  getDevelopmentMirror,
  getDevelopmentUnitDetail,
  MIRROR_UNIT_LIMIT,
} from "@/services/developments";
import { getUnitProposalSummary } from "@/services/proposals";
import { requireRealEstateWorkspace } from "@/services/workspace";

import { updateUnit } from "../actions";

type DevelopmentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unit?: string; error?: string; message?: string }>;
};

export const metadata: Metadata = { title: "Espelho de vendas" };

const deliveryFormat = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function DevelopmentPage({ params, searchParams }: DevelopmentPageProps) {
  const { id } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { organization } = await requireRealEstateWorkspace();
  const unitId = z.uuid().safeParse(query.unit);

  const [development, unit, unitProposals] = await Promise.all([
    getDevelopmentMirror(organization.id, id),
    unitId.success ? getDevelopmentUnitDetail(organization.id, id, unitId.data) : Promise.resolve(null),
    unitId.success ? getUnitProposalSummary(organization.id, unitId.data) : Promise.resolve(null),
  ]);
  if (!development) notFound();

  const isAdmin = isOrganizationAdmin(organization.role);
  const { overview } = development;

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Link href="/developments" className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="size-3.5" /> Voltar para empreendimentos</Link>
      <Notice error={query.error} message={query.message} />

      <header className="mt-5 overflow-hidden rounded-2xl border border-[#E8A51B]/20 bg-[#172033] text-white shadow-xl shadow-[#172033]/10">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E8A51B] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#172033] uppercase">{developmentStageLabels[development.stage]}</span>
              {development.developer_name && <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/70">{development.developer_name}</span>}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{development.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/60">
              <span className="flex items-center gap-1.5"><MapPin className="size-4 text-[#E8A51B]" />{development.neighborhood ? `${development.neighborhood}, ` : ""}{development.city}</span>
              {development.delivery_date && (
                <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-[#E8A51B]" />Entrega {deliveryFormat.format(new Date(development.delivery_date))}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HeaderMetric label="Unidades" value={String(overview.total_units)} />
            <HeaderMetric label="Disponíveis" value={String(overview.available_units)} />
            <HeaderMetric label="VGV total" value={formatCurrency(overview.total_vgv)} />
            <HeaderMetric label="VGV vendido" value={formatCurrency(overview.sold_vgv)} />
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MirrorLegend
          counts={{
            available: overview.available_units,
            in_proposal: overview.in_proposal_units,
            reserved: overview.reserved_units,
            sold: overview.sold_units,
            rented: overview.rented_units,
            blocked: overview.blocked_units,
          }}
        />
        {isAdmin && (
          <Link href={`/developments/${development.id}/settings`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Settings2 className="size-3.5" /> Blocos, unidades e regras
          </Link>
        )}
      </div>

      {development.truncated && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Este empreendimento tem {development.unitCount} unidades; o espelho mostra as primeiras {MIRROR_UNIT_LIMIT}.
        </p>
      )}

      {development.unitCount === 0 ? (
        <section className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8A51B]/35 bg-[#FFF6D8]/40 px-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white text-brand shadow-xs"><Building className="size-5" /></span>
          <h2 className="mt-4 text-sm font-semibold text-gray-900">O espelho ainda está vazio</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
            {isAdmin ? "Crie os blocos e gere as unidades para montar o espelho." : "Um administrador precisa cadastrar as unidades."}
          </p>
          {isAdmin && <Link href={`/developments/${development.id}/settings`} className="mt-4 text-xs font-semibold text-brand-dark hover:underline">Cadastrar unidades</Link>}
        </section>
      ) : (
        <div className={`mt-5 grid gap-5 ${unit ? "lg:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
          {unit && (
            <div className="lg:order-2">
              <UnitPanel
                development={development}
                unit={unit}
                isAdmin={isAdmin}
                canPropose={organization.role !== "viewer"}
                proposals={unitProposals ?? { hasActive: false, queued: 0, visible: [] }}
                updateAction={updateUnit}
              />
            </div>
          )}
          <div className="min-w-0 lg:order-1">
            <MirrorGrid developmentId={development.id} mirror={development.mirror} selectedUnitId={unit?.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] font-medium tracking-wide text-white/50 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold whitespace-nowrap text-[#FFD978]">{value}</p>
    </div>
  );
}
