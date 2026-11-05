import { BedDouble, CarFront, Clock3, FilePlus2, FolderOpen, Lock, Ruler, X } from "lucide-react";
import Link from "next/link";

import { FinancingSimulator } from "@/components/developments/financing-simulator";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  manualUnitStatuses,
  unitStatusDots,
  unitStatusLabels,
} from "@/lib/developments";
import { proposalStatusLabels, proposalStatusStyles } from "@/lib/proposals";
import { cn, formatCurrency } from "@/lib/utils";
import type { DevelopmentUnitDetail, UnitProposalSummary } from "@/types/crm";
import type { Tables } from "@/types/database";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const eventLabels: Record<string, string> = {
  unit_status_changed: "Status alterado",
  unit_price_changed: "Preço alterado",
};

function describeEvent(event: Tables<"real_estate_events">) {
  const metadata = (event.metadata ?? {}) as Record<string, unknown>;
  if (event.event_type === "unit_status_changed") {
    const from = unitStatusLabels[metadata.from as keyof typeof unitStatusLabels] ?? String(metadata.from);
    const to = unitStatusLabels[metadata.to as keyof typeof unitStatusLabels] ?? String(metadata.to);
    return `${from} → ${to}`;
  }
  if (event.event_type === "unit_price_changed") {
    return `${formatCurrency(Number(metadata.from))} → ${formatCurrency(Number(metadata.to))}`;
  }
  return null;
}

export function UnitPanel({
  development,
  unit,
  isAdmin,
  canPropose,
  proposals,
  updateAction,
}: {
  development: Tables<"developments">;
  unit: DevelopmentUnitDetail;
  isAdmin: boolean;
  canPropose: boolean;
  proposals: UnitProposalSummary;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const lockedByProposal = unit.status === "in_proposal";
  const acceptsProposals = unit.status === "available" || unit.status === "in_proposal";

  return (
    <aside className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-sm lg:sticky lg:top-4" aria-label={`Unidade ${unit.code}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-brand-dark uppercase">
            {unit.tower_name ?? "Sem bloco"}
            {unit.floor !== null && ` · ${unit.floor === 0 ? "Térreo" : `${unit.floor}º andar`}`}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-gray-950">Unidade {unit.code}</h2>
        </div>
        <Link href={`/developments/${development.id}`} scroll={false} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-700" aria-label="Fechar unidade">
          <X className="size-4" />
        </Link>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-xs">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <span className={cn("size-2.5 rounded-full", unitStatusDots[unit.status])} />
          {unitStatusLabels[unit.status]}
        </span>
        <span className="text-lg font-semibold tracking-[-0.03em] text-[#172033]">{formatCurrency(unit.list_price)}</span>
      </div>

      {canPropose && acceptsProposals && (
        <Link
          href={`/proposals/new?unit=${unit.id}`}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white"
        >
          <FilePlus2 className="size-4" />
          {proposals.hasActive ? "Criar proposta (entra na fila)" : "Criar proposta"}
        </Link>
      )}

      <section className="rounded-xl bg-white p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FolderOpen className="size-4 text-brand-dark" /> Pasta da unidade</h3>
        <p className="mt-1 text-[11px] text-gray-500">
          {proposals.hasActive ? "1 proposta em análise" : "Nenhuma proposta em análise"}
          {proposals.queued > 0 && ` · ${proposals.queued} na fila`}
        </p>
        {proposals.visible.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {proposals.visible.map((proposal) => (
              <li key={proposal.id}>
                <Link href={`/proposals/${proposal.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-xs hover:bg-gray-50">
                  <span className="min-w-0">
                    <span className="font-semibold text-gray-900">#{proposal.number}</span>
                    <span className="text-gray-500"> · {proposal.buyer_name ?? "Comprador"}{isAdmin && proposal.broker_name ? ` · ${proposal.broker_name}` : ""}</span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", proposalStatusStyles[proposal.status])}>
                    {proposalStatusLabels[proposal.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[11px] text-gray-400">{isAdmin ? "Nenhuma proposta registrada." : "Você não tem propostas nesta unidade."}</p>
        )}
      </section>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Detail icon={Ruler} label="Área" value={unit.area_m2 === null ? "—" : `${unit.area_m2} m²`} />
        <Detail icon={BedDouble} label="Quartos" value={unit.bedrooms === null ? "—" : String(unit.bedrooms)} />
        <Detail icon={CarFront} label="Vagas" value={unit.parking_spaces === null ? "—" : String(unit.parking_spaces)} />
      </dl>
      {(unit.typology || unit.notes) && (
        <div className="rounded-xl bg-white px-4 py-3 text-xs text-gray-600 shadow-xs">
          {unit.typology && <p><span className="font-medium text-gray-900">Tipologia:</span> {unit.typology}</p>}
          {unit.notes && <p className="mt-1 whitespace-pre-line">{unit.notes}</p>}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <Clock3 className="size-3.5" />
        Status desde {dateTime.format(new Date(unit.status_changed_at))}
        {unit.status_changed_by_name && ` por ${unit.status_changed_by_name}`}
      </p>

      {(unit.status === "available" || unit.status === "in_proposal") && (
        <FinancingSimulator
          key={unit.id}
          propertyPrice={unit.list_price}
          annualRatePercent={development.financing_annual_rate}
          maxTermMonths={development.financing_max_term_months}
          maxLtvPercent={development.financing_max_ltv}
          incomeCommitmentLimitPercent={development.income_commitment_limit}
        />
      )}

      {isAdmin && (
        <form action={updateAction} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Atualizar unidade</h3>
          <input type="hidden" name="developmentId" value={development.id} />
          <input type="hidden" name="unitId" value={unit.id} />
          {lockedByProposal ? (
            <p className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Lock className="mt-0.5 size-3.5 shrink-0" /> Unidade travada por proposta em análise. O status muda pelo fluxo de propostas.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="unit-status">Status</Label>
              {lockedByProposal ? (
                <>
                  <input type="hidden" name="status" value="in_proposal" />
                  <Select id="unit-status" value="in_proposal" disabled>
                    <option value="in_proposal">{unitStatusLabels.in_proposal}</option>
                  </Select>
                </>
              ) : (
                <Select id="unit-status" name="status" defaultValue={unit.status}>
                  {manualUnitStatuses.map((status) => (
                    <option key={status} value={status}>{unitStatusLabels[status]}</option>
                  ))}
                </Select>
              )}
            </div>
            <div>
              <Label htmlFor="unit-price">Preço de tabela</Label>
              <Input id="unit-price" name="listPrice" type="number" step="0.01" min={0} defaultValue={unit.list_price} required />
            </div>
            <div className="col-span-2">
              <Label htmlFor="unit-typology">Tipologia</Label>
              <Input id="unit-typology" name="typology" maxLength={80} defaultValue={unit.typology ?? ""} placeholder="Ex.: 2 quartos com suíte" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="unit-notes">Observações</Label>
              <Textarea id="unit-notes" name="notes" rows={2} maxLength={1000} defaultValue={unit.notes ?? ""} />
            </div>
          </div>
          <button className="h-9 w-full rounded-lg bg-[#172033] text-sm font-semibold text-white hover:bg-black">Salvar unidade</button>
        </form>
      )}

      {unit.events.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500">Histórico</h3>
          <ol className="mt-2 space-y-1.5">
            {unit.events.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[11px] shadow-xs">
                <span className="text-gray-700">
                  <span className="font-medium">{eventLabels[event.event_type] ?? event.event_type}</span>
                  {describeEvent(event) && <span className="text-gray-500"> · {describeEvent(event)}</span>}
                </span>
                <time className="shrink-0 text-gray-400" dateTime={event.created_at}>{dateTime.format(new Date(event.created_at))}</time>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2.5 shadow-xs">
      <Icon className="mx-auto size-3.5 text-brand-dark" />
      <dt className="mt-1 text-[10px] text-gray-400">{label}</dt>
      <dd className="text-xs font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
