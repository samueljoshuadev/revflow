import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock3,
  Gavel,
  HandCoins,
  ListChecks,
  ReceiptText,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Field } from "@/components/developments/development-form";
import { Notice } from "@/components/developments/notice";
import { AnalysisCard, CommissionCard } from "@/components/proposals/analysis-cards";
import { PartyCard, PartyFields } from "@/components/proposals/party-card";
import { PaymentPlanEditor } from "@/components/proposals/payment-plan-editor";
import { Label, Textarea } from "@/components/ui/field";
import { isOrganizationAdmin } from "@/lib/developments";
import {
  analyzeProposal,
  calculateCommission,
  paymentKindLabels,
  toCommercialRules,
  type PaymentItem,
} from "@/lib/proposal-analysis";
import {
  describeDeadline,
  describeMissingRequirements,
  isProposalEditable,
  isProposalOpen,
  proposalStatusLabels,
  proposalStatusStyles,
} from "@/lib/proposals";
import { cn, formatCurrency } from "@/lib/utils";
import { getProposalDetail } from "@/services/proposals";
import { requireRealEstateWorkspace } from "@/services/workspace";

import {
  cancelProposal,
  decideProposal,
  removeProposalDocument,
  removeProposalParty,
  saveProposalParty,
  submitProposal,
  savePaymentPlan,
  updateProposalTerms,
  uploadProposalDocument,
} from "../actions";

export const metadata: Metadata = { title: "Proposta" };

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const eventLabels: Record<string, string> = {
  proposal_created: "Rascunho criado",
  proposal_submitted: "Enviada para análise",
  proposal_resubmitted: "Reenviada após contraproposta",
  proposal_queued: "Entrou na fila",
  proposal_promoted: "Saiu da fila e entrou em análise",
  proposal_approved: "Aprovada",
  proposal_rejected: "Recusada",
  proposal_countered: "Contraproposta da incorporadora",
  proposal_cancelled: "Cancelada",
  proposal_expired: "Expirada",
  proposal_sla_breached: "Prazo de análise vencido",
};

export default async function ProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { user, organization } = await requireRealEstateWorkspace();
  const proposal = await getProposalDetail(organization.id, id);
  if (!proposal) notFound();

  const isAdmin = isOrganizationAdmin(organization.role);
  const isOwner = user.id === proposal.broker_user_id || user.id === proposal.created_by;
  const canWrite = organization.role !== "viewer";
  const editable = canWrite && isProposalEditable(proposal.status) && (isAdmin || isOwner);
  const canCancel = canWrite && isProposalOpen(proposal.status) && (isAdmin || isOwner);
  const canDecide = isAdmin && (proposal.status === "in_review" || proposal.status === "countered");
  const missing = describeMissingRequirements(proposal.missing, proposal.parties);
  const deadline =
    proposal.status === "in_review" || proposal.status === "countered" ? describeDeadline(proposal.sla_due_at) : null;
  const discount = proposal.list_price_snapshot > 0 ? ((proposal.offered_price - proposal.list_price_snapshot) / proposal.list_price_snapshot) * 100 : 0;
  const buyer = proposal.parties.find((party) => party.role === "buyer");
  const hasSpouse = proposal.parties.some((party) => party.role === "spouse");
  const usingSnapshot = proposal.status !== "draft" && proposal.commercial_rules_snapshot !== null;
  const rules = toCommercialRules(usingSnapshot ? proposal.commercial_rules_snapshot : proposal.current_rules);
  const planItems: PaymentItem[] = proposal.payment_items.map((item) => ({
    kind: item.kind,
    installment_count: item.installment_count,
    installment_amount: Number(item.installment_amount),
    first_due_date: item.first_due_date,
    interval_months: item.interval_months,
  }));
  const hasPlan = planItems.length > 0;
  const analysis = analyzeProposal({
    listPrice: proposal.list_price_snapshot,
    offeredPrice: proposal.offered_price,
    items: planItems,
    rules,
    deliveryDate: proposal.development.delivery_date,
    referenceDate: proposal.analysis_reference_date ?? new Date().toISOString().slice(0, 10),
    developmentTotalVgv: proposal.development_total_vgv,
  });
  const commission = calculateCommission({
    rules,
    offeredPrice: proposal.offered_price,
    items: planItems,
    hasManager: Boolean(proposal.manager_user_id),
    hasDirector: Boolean(proposal.director_user_id),
    hasPartner: Boolean(proposal.partner_agency_id),
  });
  const partyActions = {
    saveAction: saveProposalParty,
    removeAction: removeProposalParty,
    uploadAction: uploadProposalDocument,
    removeDocumentAction: removeProposalDocument,
  };

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <Link href="/proposals" className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="size-3.5" /> Voltar para propostas</Link>
      <Notice error={notice.error} message={notice.message} />

      <header className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Proposta #{proposal.number}</span>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", proposalStatusStyles[proposal.status])}>
                {proposalStatusLabels[proposal.status]}
                {proposal.status === "queued" && proposal.queue_position ? ` · posição ${proposal.queue_position}` : ""}
              </span>
              {deadline && (
                <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium", deadline.overdue ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600")}>
                  <Clock3 className="size-3.5" />
                  {proposal.status === "countered" ? "Resposta do corretor: " : "Análise: "}{deadline.text}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-gray-950">
              <Link href={`/developments/${proposal.development_id}?unit=${proposal.unit_id}`} className="hover:underline">
                {proposal.development_name} · Unidade {proposal.unit_code}
              </Link>
            </h1>
            <p className="mt-1 text-sm text-gray-500">{buyer?.full_name ?? "Comprador não informado"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label="Valor ofertado" value={formatCurrency(proposal.offered_price)} />
            <Metric label="Tabela (no envio)" value={formatCurrency(proposal.list_price_snapshot)} />
            <Metric
              label="Diferença"
              value={`${discount > 0 ? "+" : ""}${discount.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              tone={discount < 0 ? "warn" : "ok"}
            />
          </div>
        </div>
        {proposal.status === "countered" && proposal.counter_offer_price && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            <strong>Contraproposta: {formatCurrency(proposal.counter_offer_price)}.</strong>{" "}
            {proposal.decision_note}
            {editable && <span className="block text-xs text-violet-700">Ajuste os valores e reenvie, ou cancele a proposta.</span>}
          </div>
        )}
        {(proposal.status === "approved" || proposal.status === "rejected") && proposal.decision_note && (
          <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <strong>Parecer{proposal.decided_by_name ? ` de ${proposal.decided_by_name}` : ""}:</strong> {proposal.decision_note}
          </p>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {editable && (
            <section className={cn("rounded-xl border p-5", missing.length ? "border-amber-200 bg-amber-50/60" : "border-emerald-200 bg-emerald-50/60")}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  {missing.length ? <ListChecks className="size-4 text-amber-600" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
                  {missing.length ? `Faltam ${missing.length} itens para enviar` : "Tudo pronto para enviar"}
                </h2>
                <form action={submitProposal}>
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <button disabled={missing.length > 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#172033] px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">
                    <Send className="size-4" /> {proposal.status === "countered" ? "Reenviar para análise" : "Enviar para análise"}
                  </button>
                </form>
              </div>
              {missing.length > 0 && (
                <ul className="mt-3 grid gap-1.5 text-xs text-amber-900 sm:grid-cols-2">
                  {missing.map((item) => <li key={item.code} className="flex gap-1.5"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{item.label}</li>)}
                </ul>
              )}
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><ReceiptText className="size-4 text-brand-dark" /> Fluxo de pagamento</h2>
            <p className="mt-1 text-[11px] text-gray-500">Como o cliente vai pagar. É a base da análise e do cálculo da comissão.</p>
            {editable ? (
              <PaymentPlanEditor
                key={proposal.payment_items.map((item) => item.id).join(",") || "empty"}
                proposalId={proposal.id}
                offeredPrice={proposal.offered_price}
                initialItems={planItems}
                minDownPaymentPercent={rules?.min_down_payment_percent ?? null}
                deliveryDate={proposal.development.delivery_date}
                action={savePaymentPlan}
              />
            ) : hasPlan ? (
              <ul className="mt-3 divide-y divide-gray-100 text-xs">
                {proposal.payment_items.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-medium text-gray-900">{paymentKindLabels[item.kind]}</span>
                    <span className="text-gray-600">
                      {item.installment_count}x {formatCurrency(Number(item.installment_amount))} · a partir de{" "}
                      {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${item.first_due_date}T00:00:00Z`))}
                      {item.installment_count > 1 && item.interval_months > 1 ? ` · a cada ${item.interval_months} meses` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">{formatCurrency(Number(item.total_amount))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-gray-400">Fluxo não informado.</p>
            )}
          </section>

          {proposal.parties.map((party) => (
            <PartyCard
              key={party.id}
              proposalId={proposal.id}
              party={party}
              documents={proposal.documents.filter((document) => document.party_id === party.id)}
              editable={editable}
              {...partyActions}
            />
          ))}

          {editable && (
            <section className="rounded-xl border border-dashed border-gray-300 bg-white p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><UserPlus className="size-4 text-brand-dark" /> Adicionar participante</h3>
              <div className="mt-3 space-y-2">
                {!hasSpouse && (
                  <details className="rounded-lg border border-gray-200">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700">Cônjuge / companheiro(a)</summary>
                    <PartyFields proposalId={proposal.id} action={saveProposalParty} newRole="spouse" />
                  </details>
                )}
                <details className="rounded-lg border border-gray-200">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-gray-700">Co-comprador (compõe renda)</summary>
                  <PartyFields proposalId={proposal.id} action={saveProposalParty} newRole="co_buyer" />
                </details>
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          {canDecide && (
            <section className="rounded-xl border-2 border-[#172033] bg-white p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Gavel className="size-4" /> Decisão da incorporadora</h2>
              <form action={decideProposal} className="mt-4 space-y-3">
                <input type="hidden" name="proposalId" value={proposal.id} />
                <div>
                  <Label htmlFor="decision-note">Parecer (visível para o corretor)</Label>
                  <Textarea id="decision-note" name="note" rows={3} maxLength={2000} />
                </div>
                {proposal.status === "in_review" && (
                  <Field label="Valor da contraproposta (R$)" name="counterOfferPrice" id="counter-price" type="number" step="0.01" min={1} placeholder="Só para contraproposta" />
                )}
                <div className="grid gap-2">
                  {proposal.status === "in_review" && (
                    <button name="decision" value="approved" className="h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">Aprovar e reservar unidade</button>
                  )}
                  {proposal.status === "in_review" && (
                    <button name="decision" value="countered" className="h-10 rounded-lg border border-violet-300 bg-violet-50 text-sm font-semibold text-violet-800 hover:bg-violet-100">Enviar contraproposta</button>
                  )}
                  <button name="decision" value="rejected" className="h-10 rounded-lg border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-50">Recusar</button>
                </div>
              </form>
            </section>
          )}

          <AnalysisCard analysis={analysis} usingSnapshot={usingSnapshot} />
          <CommissionCard
            commission={commission}
            names={{
              broker: proposal.broker_name,
              manager: proposal.manager_name,
              director: proposal.director_name,
              partner: proposal.partner_agency?.name ?? null,
            }}
          />

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><HandCoins className="size-4 text-brand-dark" /> Valores e pagamento</h2>
            {editable ? (
              <form action={updateProposalTerms} className="mt-4 grid grid-cols-2 gap-3">
                <input type="hidden" name="proposalId" value={proposal.id} />
                <div className="col-span-2"><Field label="Valor ofertado (R$)" name="offeredPrice" id="terms-offered" type="number" step="0.01" min={1} defaultValue={proposal.offered_price} required /></div>
                {hasPlan ? (
                  <p className="col-span-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                    Entrada {formatCurrency(proposal.down_payment)} · FGTS {formatCurrency(proposal.fgts_amount)} · Financiamento {formatCurrency(proposal.financing_amount)}. Calculados pelo fluxo de pagamento.
                  </p>
                ) : (
                  <>
                    <Field label="Entrada (R$)" name="downPayment" id="terms-down" type="number" step="0.01" min={0} defaultValue={proposal.down_payment} />
                    <Field label="FGTS (R$)" name="fgtsAmount" id="terms-fgts" type="number" step="0.01" min={0} defaultValue={proposal.fgts_amount} />
                    <div className="col-span-2"><Field label="Financiamento (R$)" name="financingAmount" id="terms-financing" type="number" step="0.01" min={0} defaultValue={proposal.financing_amount} /></div>
                  </>
                )}
                <div className="col-span-2">
                  <Label htmlFor="terms-payment">Condições de pagamento</Label>
                  <Textarea id="terms-payment" name="paymentNotes" rows={2} maxLength={2000} defaultValue={proposal.payment_notes ?? ""} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="terms-notes">Observações internas</Label>
                  <Textarea id="terms-notes" name="notes" rows={2} maxLength={2000} defaultValue={proposal.notes ?? ""} />
                </div>
                <button className="col-span-2 h-9 rounded-lg bg-brand text-xs font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">Salvar valores</button>
              </form>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Entrada" value={formatCurrency(proposal.down_payment)} />
                <Row label="FGTS" value={formatCurrency(proposal.fgts_amount)} />
                <Row label="Financiamento" value={formatCurrency(proposal.financing_amount)} />
                {proposal.payment_notes && <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs whitespace-pre-line text-gray-600">{proposal.payment_notes}</p>}
              </dl>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Users className="size-4 text-brand-dark" /> Equipe</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Corretor" value={proposal.broker_name ?? "—"} />
              <Row label="Gerente" value={proposal.manager_name ?? "—"} />
              <Row label="Diretor" value={proposal.director_name ?? "—"} />
              {proposal.partner_agency && <Row label="Imobiliária" value={proposal.partner_agency.name} />}
              {proposal.external_broker_name && (
                <Row label="Corretor parceiro" value={[proposal.external_broker_name, proposal.external_broker_creci && `CRECI ${proposal.external_broker_creci}`].filter(Boolean).join(" · ")} />
              )}
              {proposal.lead && (
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Lead</dt><dd><Link href={`/leads/${proposal.lead.id}`} className="font-medium text-brand-dark hover:underline">{proposal.lead.name}</Link></dd></div>
              )}
            </dl>
          </section>

          {proposal.events.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-gray-900">Histórico</h2>
              <ol className="mt-3 space-y-2">
                {proposal.events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-gray-700">{eventLabels[event.event_type] ?? event.event_type}</span>
                    <time className="shrink-0 text-gray-400" dateTime={event.created_at}>{dateTime.format(new Date(event.created_at))}</time>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {canCancel && (
            <details className="rounded-xl border border-gray-200 bg-white p-4">
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-red-700"><Ban className="size-3.5" /> Cancelar proposta</summary>
              <form action={cancelProposal} className="mt-3 space-y-2">
                <input type="hidden" name="proposalId" value={proposal.id} />
                <Textarea name="reason" rows={2} maxLength={500} placeholder="Motivo (opcional)" aria-label="Motivo do cancelamento" />
                <button className="h-9 w-full rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700">Confirmar cancelamento</button>
              </form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <p className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold whitespace-nowrap", tone === "warn" ? "text-amber-700" : "text-gray-950")}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
