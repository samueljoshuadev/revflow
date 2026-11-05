import { ArrowLeft, Building2, HandCoins, Info, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Field } from "@/components/developments/development-form";
import { Notice } from "@/components/developments/notice";
import { PageHeader } from "@/components/page-header";
import { Label, Select, Textarea } from "@/components/ui/field";
import { isOrganizationAdmin, unitStatusLabels } from "@/lib/developments";
import { formatCurrency } from "@/lib/utils";
import {
  getUnitForProposal,
  listLeadsForProposal,
  listPartnerAgencies,
} from "@/services/proposals";
import { requireRealEstateWorkspace } from "@/services/workspace";

import { createProposal } from "../actions";

export const metadata = { title: "Nova proposta" };

export default async function NewProposalPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; error?: string }>;
}) {
  const params = await searchParams;
  const unitId = z.uuid().safeParse(params.unit);
  if (!unitId.success) notFound();
  const { user, organization } = await requireRealEstateWorkspace();
  const [target, leads, partners] = await Promise.all([
    getUnitForProposal(organization.id, unitId.data),
    listLeadsForProposal(organization.id, user.id, isOrganizationAdmin(organization.role)),
    listPartnerAgencies(organization.id),
  ]);
  if (!target) notFound();
  const { unit, development } = target;
  const canPropose = unit.status === "available" || unit.status === "in_proposal";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <Link href={`/developments/${development.id}?unit=${unit.id}`} className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="size-3.5" /> Voltar para a unidade
      </Link>
      <PageHeader
        eyebrow="Nova proposta"
        title={`${development.name} · Unidade ${unit.code}`}
        description="Comece com o essencial. Documentos e dados completos entram na próxima tela."
      />
      <Notice error={params.error} />

      <section className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm shadow-xs">
        <span className="flex items-center gap-2 font-semibold text-gray-900"><Building2 className="size-4 text-brand-dark" /> {unitStatusLabels[unit.status]}</span>
        <span className="text-gray-500">Tabela <strong className="text-gray-900">{formatCurrency(unit.list_price)}</strong></span>
        {target.hasActive && (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <Info className="size-3.5" /> Já existe proposta em análise: a sua entra na fila{target.queued ? `, depois de outras ${target.queued}` : ""}.
          </span>
        )}
      </section>

      {!canPropose ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Esta unidade está {unitStatusLabels[unit.status].toLowerCase()} e não aceita novas propostas.
        </p>
      ) : (
        <form action={createProposal} className="mt-6 space-y-5">
          <input type="hidden" name="unitId" value={unit.id} />

          <Card icon={UserRound} title="Comprador" description="Nome e contato. CPF, estado civil e renda você completa depois.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nome completo" name="buyerName" required minLength={2} maxLength={180} />
              <Field label="Telefone / WhatsApp" name="buyerPhone" type="tel" maxLength={30} />
              <Field label="E-mail" name="buyerEmail" type="email" maxLength={254} />
              {leads.length > 0 && (
                <div className="sm:col-span-3">
                  <Label htmlFor="leadId">Vincular a um lead (opcional)</Label>
                  <Select id="leadId" name="leadId" defaultValue="">
                    <option value="">Sem lead vinculado</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.name}{lead.phone ? ` · ${lead.phone}` : ""}</option>
                    ))}
                  </Select>
                  <p className="mt-1 text-[11px] text-gray-400">O lead avança no funil automaticamente quando a proposta é enviada e decidida.</p>
                </div>
              )}
            </div>
          </Card>

          <Card icon={HandCoins} title="Valores" description="Entrada + FGTS + financiamento não podem passar do valor ofertado.">
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Valor ofertado (R$)" name="offeredPrice" type="number" step="0.01" min={1} defaultValue={unit.list_price} required />
              <Field label="Entrada (R$)" name="downPayment" type="number" step="0.01" min={0} />
              <Field label="FGTS (R$)" name="fgtsAmount" type="number" step="0.01" min={0} />
              <Field label="Financiamento (R$)" name="financingAmount" type="number" step="0.01" min={0} />
              <div className="sm:col-span-4">
                <Label htmlFor="paymentNotes">Condições de pagamento</Label>
                <Textarea id="paymentNotes" name="paymentNotes" rows={2} maxLength={2000} placeholder="Ex.: entrada em 3x, intermediárias semestrais..." />
              </div>
            </div>
          </Card>

          <Card icon={Users} title="Imobiliária parceira (opcional)" description="Use quando a venda vier de uma imobiliária ou corretor de fora da equipe.">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <Label htmlFor="partnerAgencyId">Imobiliária</Label>
                <Select id="partnerAgencyId" name="partnerAgencyId" defaultValue="">
                  <option value="">Equipe própria</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name}</option>
                  ))}
                </Select>
              </div>
              <Field label="Corretor parceiro" name="externalBrokerName" maxLength={180} />
              <Field label="Telefone do corretor" name="externalBrokerPhone" type="tel" maxLength={30} />
              <Field label="CRECI" name="externalBrokerCreci" maxLength={40} />
            </div>
            {partners.length === 0 && isOrganizationAdmin(organization.role) && (
              <p className="mt-3 text-[11px] text-gray-400">Cadastre imobiliárias parceiras em <Link href="/team" className="font-medium text-brand-dark hover:underline">Corretores</Link>.</p>
            )}
          </Card>

          <div className="flex justify-end">
            <button className="h-11 rounded-lg bg-brand px-6 text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">
              Criar rascunho da proposta
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><Icon className="size-4" /></span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
